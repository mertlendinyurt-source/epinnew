import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// Risk threshold
const RISK_THRESHOLD = 50;

// Calculate order risk
async function calculateOrderRisk(db, order, user, ip) {
  let score = 0;
  const reasons = [];

  if (!user) {
    return { score: 0, status: 'CLEAR', reasons: ['Kullanıcı bulunamadı'], calculatedAt: new Date() };
  }

  // 1. New account check
  const accountAgeMs = new Date() - new Date(user.createdAt);
  const accountAgeHours = accountAgeMs / (1000 * 60 * 60);
  if (accountAgeHours < 1) {
    score += 25;
    reasons.push('Yeni hesap (1 saatten az)');
  } else if (accountAgeHours < 24) {
    score += 10;
    reasons.push('Hesap 24 saatten yeni');
  }

  // 2. First order
  const previousOrders = await db.collection('orders').countDocuments({ 
    userId: user.id, 
    status: { $in: ['paid', 'completed'] } 
  });
  if (previousOrders === 0) {
    score += 10;
    reasons.push('İlk sipariş');
  }

  // 3. High value
  if (order.amount > 500) {
    score += 15;
    reasons.push('Yüksek değerli sipariş (' + order.amount + ' TRY)');
  } else if (order.amount > 250) {
    score += 5;
    reasons.push('Orta-yüksek değerli sipariş');
  }

  // 4. Google OAuth without phone
  if ((user.authMethod === 'google' || user.googleId) && !user.phone) {
    score += 5;
    reasons.push('Google ile giriş, telefon eksik');
  }

  const status = score >= RISK_THRESHOLD ? 'FLAGGED' : 'CLEAR';

  return {
    score: Math.min(score, 100),
    status,
    reasons,
    calculatedAt: new Date()
  };
}

// HTML redirect function
function htmlRedirect(url) {
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' + url + '"><script>window.location.href="' + url + '";</script></head><body style="background:#12151a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;"><div style="text-align:center;"><div style="font-size:40px;margin-bottom:20px;">⏳</div><p>Yönlendiriliyor...</p></div></body></html>';
  
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
    try {
      const text = await request.text();
      if (text.includes('=')) {
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) body[key] = value;
      } else if (text) {
        body = JSON.parse(text);
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
    
    // Update order status
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
    
    // If paid, calculate risk and assign stock
    if (newStatus === 'paid') {
      // Get user for risk calculation
      const orderUser = await db.collection('users').findOne({ id: order.userId });
      
      // Calculate risk
      const riskResult = await calculateOrderRisk(db, order, orderUser, null);
      console.log('Risk calculated:', { orderId, score: riskResult.score, status: riskResult.status });
      
      // Update order with risk
      await db.collection('orders').updateOne(
        { id: orderId },
        { $set: { risk: riskResult } }
      );
      
      // If FLAGGED - hold delivery
      if (riskResult.status === 'FLAGGED') {
        await db.collection('orders').updateOne(
          { id: orderId },
          { $set: { delivery: { status: 'hold', message: 'Sipariş kontrol altında', holdReason: 'risk_flagged', items: [] } } }
        );
        console.log('Order FLAGGED, delivery on HOLD:', orderId);
      } else {
        // CLEAR - assign stock
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
            console.log('Stock assigned:', orderId);
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
    }
    
    await client.close();
    
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
