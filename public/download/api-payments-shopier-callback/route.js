import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Decrypt function
function decrypt(encryptedData) {
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
}

// Generate Shopier hash
function generateShopierHash(randomNr, orderId, secret) {
  const data = `${randomNr}${orderId}`;
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

export async function POST(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  let client;
  try {
    // Parse form data (Shopier sends form-urlencoded, not JSON)
    const formData = await request.formData();
    const body = {};
    for (const [key, value] of formData.entries()) {
      body[key] = value;
    }
    
    console.log('Shopier callback received:', { ...body, signature: '***MASKED***' });
    
    const { status, payment_id, random_nr, platform_order_id, signature, installment } = body;
    const orderId = platform_order_id;
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pinly_store');
    
    // Validate order exists
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) {
      console.error(`Callback error: Order ${orderId} not found`);
      return NextResponse.redirect(new URL(`/payment/failed?reason=order_not_found`, baseUrl));
    }
    
    // Check if already paid
    if (order.status === 'paid') {
      console.log(`Order ${order.id} already PAID`);
      return NextResponse.redirect(new URL(`/payment/success?orderId=${order.id}`, baseUrl));
    }
    
    // Get Shopier settings
    const shopierSettings = await db.collection('shopier_settings').findOne({ isActive: true });
    
    let signatureValid = true;
    if (shopierSettings?.apiSecret) {
      try {
        const apiSecret = decrypt(shopierSettings.apiSecret);
        const expectedSignature = generateShopierHash(random_nr, orderId, apiSecret);
        signatureValid = signature === expectedSignature;
        
        if (!signatureValid) {
          console.error(`Signature mismatch. Expected: ${expectedSignature}, Received: ${signature}`);
        }
      } catch (e) {
        console.error('Signature validation error:', e);
      }
    }
    
    // Determine payment status
    const newStatus = status === 'success' ? 'paid' : 'failed';
    
    // Update order status
    await db.collection('orders').updateOne(
      { id: order.id },
      { $set: { status: newStatus, updatedAt: new Date() } }
    );
    
    // Create payment record
    await db.collection('payments').insertOne({
      id: uuidv4(),
      orderId: order.id,
      provider: 'shopier',
      providerTxnId: payment_id?.toString() || uuidv4(),
      status: newStatus,
      amount: order.amount,
      currency: order.currency || 'TRY',
      installment: parseInt(installment) || 0,
      signatureValidated: signatureValid,
      rawPayload: { ...body, signature: '***MASKED***' },
      createdAt: new Date()
    });
    
    // If paid, assign stock
    if (newStatus === 'paid') {
      try {
        // Find available stock
        const availableStock = await db.collection('stock').findOne({
          productId: order.productId,
          status: 'available'
        });
        
        if (availableStock) {
          // Mark stock as sold
          await db.collection('stock').updateOne(
            { id: availableStock.id },
            { $set: { status: 'sold', orderId: order.id, soldAt: new Date() } }
          );
          
          // Update order with delivery info
          await db.collection('orders').updateOne(
            { id: order.id },
            {
              $set: {
                delivery: {
                  status: 'delivered',
                  items: [availableStock.code],
                  stockId: availableStock.id,
                  assignedAt: new Date()
                }
              }
            }
          );
          console.log(`Stock assigned to order ${order.id}`);
        } else {
          await db.collection('orders').updateOne(
            { id: order.id },
            {
              $set: {
                delivery: { status: 'pending', message: 'Stok bekleniyor', items: [] }
              }
            }
          );
          console.warn(`No stock available for order ${order.id}`);
        }
      } catch (stockError) {
        console.error('Stock assignment error:', stockError);
      }
    }
    
    await client.close();
    
    // Redirect to success or failed page
    if (newStatus === 'paid') {
      return NextResponse.redirect(new URL(`/payment/success?orderId=${order.id}`, baseUrl));
    } else {
      return NextResponse.redirect(new URL(`/payment/failed?orderId=${order.id}`, baseUrl));
    }
    
  } catch (error) {
    console.error('Shopier callback error:', error);
    if (client) await client.close();
    return NextResponse.redirect(new URL(`/payment/failed?reason=error`, baseUrl));
  }
}

// Also handle GET requests (some payment gateways use GET)
export async function GET(request) {
  return POST(request);
}
