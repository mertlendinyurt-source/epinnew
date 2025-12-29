import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

async function handleCallback(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinly.com.tr';
  let client;
  
  try {
    // Parse body - try multiple formats
    let body = {};
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          body[key] = value;
        }
      } catch (e) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          body[key] = value;
        }
      }
    } else {
      try {
        const text = await request.text();
        if (text.includes('=')) {
          const params = new URLSearchParams(text);
          for (const [key, value] of params.entries()) {
            body[key] = value;
          }
        } else {
          body = JSON.parse(text);
        }
      } catch (e) {
        console.error('Body parse error:', e);
      }
    }
    
    console.log('Shopier callback:', JSON.stringify({ ...body, signature: '***' }));
    
    const { status, payment_id, random_nr, platform_order_id, signature, installment } = body;
    const orderId = platform_order_id;
    
    if (!orderId) {
      console.error('No order ID');
      return NextResponse.redirect(new URL('/payment/failed?reason=no_order_id', baseUrl));
    }
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pinly_store');
    
    // Find order
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) {
      console.error(`Order ${orderId} not found`);
      await client.close();
      return NextResponse.redirect(new URL('/payment/failed?reason=order_not_found', baseUrl));
    }
    
    console.log('Order found:', { id: order.id, productId: order.productId, status: order.status });
    
    // Already paid?
    if (order.status === 'paid') {
      await client.close();
      return NextResponse.redirect(new URL(`/payment/success?orderId=${orderId}`, baseUrl));
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
    
    // If paid, try to assign stock
    if (newStatus === 'paid') {
      try {
        console.log('Looking for stock with productId:', order.productId);
        
        // Try multiple ways to find stock
        let stock = await db.collection('stock').findOne({
          productId: order.productId,
          status: 'available'
        });
        
        // If not found, try with string conversion
        if (!stock) {
          stock = await db.collection('stock').findOne({
            productId: String(order.productId),
            status: 'available'
          });
        }
        
        // Log all available stocks for debugging
        const allStocks = await db.collection('stock').find({ status: 'available' }).limit(5).toArray();
        console.log('Available stocks:', allStocks.map(s => ({ id: s.id, productId: s.productId, code: s.code?.substring(0,5) + '***' })));
        
        if (stock) {
          console.log('Stock found:', { id: stock.id, productId: stock.productId });
          
          await db.collection('stock').updateOne(
            { id: stock.id },
            { $set: { status: 'sold', orderId: orderId, soldAt: new Date() } }
          );
          
          await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { delivery: { status: 'delivered', items: [stock.code], stockId: stock.id, assignedAt: new Date() } } }
          );
          
          console.log('Stock assigned successfully');
        } else {
          console.warn('No stock available for productId:', order.productId);
          await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { delivery: { status: 'pending', message: 'Stok bekleniyor', items: [] } } }
          );
        }
      } catch (stockError) {
        console.error('Stock assignment error:', stockError);
        await db.collection('orders').updateOne(
          { id: orderId },
          { $set: { delivery: { status: 'pending', message: 'Stok hatası', items: [] } } }
        );
      }
    }
    
    await client.close();
    
    // Redirect
    if (newStatus === 'paid') {
      return NextResponse.redirect(new URL(`/payment/success?orderId=${orderId}`, baseUrl));
    } else {
      return NextResponse.redirect(new URL(`/payment/failed?orderId=${orderId}`, baseUrl));
    }
    
  } catch (error) {
    console.error('Callback error:', error);
    if (client) await client.close();
    return NextResponse.redirect(new URL('/payment/failed?reason=error', baseUrl));
  }
}

export async function POST(request) {
  return handleCallback(request);
}

export async function GET(request) {
  return handleCallback(request);
}
