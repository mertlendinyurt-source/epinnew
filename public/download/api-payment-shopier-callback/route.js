import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

function decrypt(encryptedData) {
  try {
    const ALGORITHM = 'aes-256-gcm';
    const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY || 'your-32-character-secret-key!!';
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Decrypt error:', e);
    return null;
  }
}

function generateShopierHash(randomNr, orderId, secret) {
  const data = `${randomNr}${orderId}`;
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

async function handleCallback(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinly.com.tr';
  let client;
  
  try {
    // Parse body - try form data first, then JSON
    let body = {};
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
    } else if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Try to parse as text and handle URL encoded
      const text = await request.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        body[key] = value;
      }
    }
    
    console.log('Shopier callback body:', { ...body, signature: '***' });
    
    const { status, payment_id, random_nr, platform_order_id, signature, installment } = body;
    const orderId = platform_order_id;
    
    if (!orderId) {
      console.error('No order ID in callback');
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
    
    // Already paid?
    if (order.status === 'paid') {
      console.log(`Order ${orderId} already paid`);
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
      rawPayload: { ...body, signature: '***' },
      createdAt: new Date()
    });
    
    // If paid, try to assign stock
    if (newStatus === 'paid') {
      try {
        const stock = await db.collection('stock').findOne({
          productId: order.productId,
          status: 'available'
        });
        
        if (stock) {
          await db.collection('stock').updateOne(
            { id: stock.id },
            { $set: { status: 'sold', orderId: orderId, soldAt: new Date() } }
          );
          
          await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { delivery: { status: 'delivered', items: [stock.code], assignedAt: new Date() } } }
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
