import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// HTML redirect function - client-side redirect to avoid SSR issues
function htmlRedirect(url) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${url}">
  <script>window.location.href="${url}";</script>
</head>
<body style="background:#12151a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
  <div style="text-align:center;">
    <div style="font-size:40px;margin-bottom:20px;">⏳</div>
    <p>Yönlendiriliyor...</p>
  </div>
</body>
</html>`;
  
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function handleCallback(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinly.com.tr';
  let client;
  
  try {
    // Parse body
    let body = {};
    const contentType = request.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('form')) {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) body[key] = value;
      } else {
        const text = await request.text();
        if (text.includes('=')) {
          const params = new URLSearchParams(text);
          for (const [key, value] of params.entries()) body[key] = value;
        } else if (text) {
          body = JSON.parse(text);
        }
      }
    } catch (e) {
      console.error('Body parse error:', e);
    }
    
    console.log('Shopier callback:', JSON.stringify({ ...body, signature: '***' }));
    
    const { status, payment_id, platform_order_id, installment } = body;
    const orderId = platform_order_id;
    
    if (!orderId) {
      return htmlRedirect(baseUrl + '/payment/failed?reason=no_order_id');
    }
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pinly_store');
    
    // Find order
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) {
      await client.close();
      return htmlRedirect(baseUrl + '/payment/failed?reason=order_not_found');
    }
    
    // Already paid?
    if (order.status === 'paid') {
      await client.close();
      return htmlRedirect(baseUrl + '/payment/success?orderId=' + orderId);
    }
    
    // Determine status
    const newStatus = (status === 'success' || status === '1') ? 'paid' : 'failed';
    
    // Update order
    await db.collection('orders').updateOne(
      { id: orderId },
      { $set: { status: newStatus, updatedAt: new Date() } }
    );
    
    // Create payment record
    await db.collection('payments').insertOne({
      id: uuidv4(),
      orderId: orderId,
      provider: 'shopier',
      providerTxnId: payment_id?.toString() || uuidv4(),
      status: newStatus,
      amount: order.amount,
      currency: 'TRY',
      installment: parseInt(installment) || 0,
      createdAt: new Date()
    });
    
    // If paid, assign stock
    if (newStatus === 'paid') {
      try {
        const stock = await db.collection('stock').findOne({
          productId: order.productId,
          status: 'available'
        });
        
        if (stock && stock.value) {
          await db.collection('stock').updateOne(
            { id: stock.id },
            { $set: { status: 'sold', orderId: orderId, soldAt: new Date() } }
          );
          
          await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { delivery: { status: 'delivered', items: [stock.value], assignedAt: new Date() } } }
          );
        } else {
          await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { delivery: { status: 'pending', message: 'Stok bekleniyor', items: [] } } }
          );
        }
      } catch (e) {
        console.error('Stock error:', e);
      }
    }
    
    await client.close();
    
    // HTML redirect instead of 302
    if (newStatus === 'paid') {
      return htmlRedirect(baseUrl + '/payment/success?orderId=' + orderId);
    } else {
      return htmlRedirect(baseUrl + '/payment/failed?orderId=' + orderId);
    }
    
  } catch (error) {
    console.error('Callback error:', error);
    if (client) await client.close();
    return htmlRedirect(baseUrl + '/payment/failed?reason=error');
  }
}

export async function POST(request) {
  return handleCallback(request);
}

export async function GET(request) {
  return handleCallback(request);
}
