import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'pubg_uc_store';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

let cachedClient = null;

async function getDb() {
  if (!cachedClient) {
    cachedClient = await MongoClient.connect(MONGO_URL);
  }
  return cachedClient.db(DB_NAME);
}

// Mock Player Resolver
const mockPlayerNames = [
  'ShadowHunter', 'DragonSlayer', 'PhoenixRising', 'ThunderStrike',
  'NightWolf', 'IceBreaker', 'FireStorm', 'DarkKnight',
  'GhostRider', 'WarriorKing', 'CyberNinja', 'BloodMoon'
];

function getMockPlayerName(playerId) {
  const index = parseInt(playerId) % mockPlayerNames.length;
  return `${mockPlayerNames[index]}#${playerId.slice(-4)}`;
}

// Verify JWT Token
function verifyToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Initialize DB with default data
async function initializeDb() {
  const db = await getDb();
  
  // Check if products exist
  const productsCount = await db.collection('products').countDocuments();
  if (productsCount === 0) {
    const defaultProducts = [
      {
        id: uuidv4(),
        title: '60 UC',
        ucAmount: 60,
        price: 25,
        discountPrice: 19.99,
        discountPercent: 20,
        active: true,
        sortOrder: 1,
        image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
        createdAt: new Date()
      },
      {
        id: uuidv4(),
        title: '325 UC',
        ucAmount: 325,
        price: 100,
        discountPrice: 89.99,
        discountPercent: 10,
        active: true,
        sortOrder: 2,
        image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=300&fit=crop',
        createdAt: new Date()
      },
      {
        id: uuidv4(),
        title: '660 UC',
        ucAmount: 660,
        price: 200,
        discountPrice: 179.99,
        discountPercent: 10,
        active: true,
        sortOrder: 3,
        image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=400&h=300&fit=crop',
        createdAt: new Date()
      },
      {
        id: uuidv4(),
        title: '1800 UC',
        ucAmount: 1800,
        price: 500,
        discountPrice: 449.99,
        discountPercent: 10,
        active: true,
        sortOrder: 4,
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
        createdAt: new Date()
      },
      {
        id: uuidv4(),
        title: '3850 UC',
        ucAmount: 3850,
        price: 1000,
        discountPrice: 899.99,
        discountPercent: 10,
        active: true,
        sortOrder: 5,
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
        createdAt: new Date()
      }
    ];
    await db.collection('products').insertMany(defaultProducts);
  }

  // Check if admin user exists
  const adminCount = await db.collection('admin_users').countDocuments();
  if (adminCount === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.collection('admin_users').insertOne({
      id: uuidv4(),
      username: 'admin',
      passwordHash: hashedPassword,
      createdAt: new Date()
    });
  }
}

// API Routes Handler
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  
  try {
    await initializeDb();
    const db = await getDb();

    // Root endpoint
    if (pathname === '/api' || pathname === '/api/') {
      return NextResponse.json({ message: 'PUBG UC Store API v1.0', status: 'ok' });
    }

    // Get all products
    if (pathname === '/api/products') {
      const products = await db.collection('products')
        .find({ active: true })
        .sort({ sortOrder: 1 })
        .toArray();
      return NextResponse.json({ success: true, data: products });
    }

    // Resolve player name (mock)
    if (pathname === '/api/player/resolve') {
      const playerId = searchParams.get('id');
      if (!playerId || playerId.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz Oyuncu ID' },
          { status: 400 }
        );
      }
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return NextResponse.json({
        success: true,
        data: {
          playerId,
          playerName: getMockPlayerName(playerId)
        }
      });
    }

    // Admin: Get all orders
    if (pathname === '/api/admin/orders') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const status = searchParams.get('status');
      const query = status ? { status } : {};
      
      const orders = await db.collection('orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ success: true, data: orders });
    }

    // Admin: Get single order
    if (pathname.match(/^\/api\/admin\/orders\/[^\/]+$/)) {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const orderId = pathname.split('/').pop();
      const order = await db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // Get payment details
      const payment = await db.collection('payments').findOne({ orderId });
      
      return NextResponse.json({
        success: true,
        data: { order, payment }
      });
    }

    // Admin: Get all products (including inactive)
    if (pathname === '/api/admin/products') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const products = await db.collection('products')
        .find({})
        .sort({ sortOrder: 1 })
        .toArray();
      
      return NextResponse.json({ success: true, data: products });
    }

    // Admin: Dashboard stats
    if (pathname === '/api/admin/dashboard') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const totalOrders = await db.collection('orders').countDocuments();
      const paidOrders = await db.collection('orders').countDocuments({ status: 'paid' });
      const pendingOrders = await db.collection('orders').countDocuments({ status: 'pending' });
      
      const revenueResult = await db.collection('orders').aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      const totalRevenue = revenueResult[0]?.total || 0;

      // Recent orders
      const recentOrders = await db.collection('orders')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalOrders,
            paidOrders,
            pendingOrders,
            totalRevenue
          },
          recentOrders
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint bulunamadı' },
      { status: 404 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url);
  
  try {
    await initializeDb();
    const db = await getDb();
    const body = await request.json();

    // Admin login
    if (pathname === '/api/admin/login') {
      const { username, password } = body;
      
      const user = await db.collection('admin_users').findOne({ username });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı adı veya şifre hatalı' },
          { status: 401 }
        );
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı adı veya şifre hatalı' },
          { status: 401 }
        );
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return NextResponse.json({
        success: true,
        data: { token, username: user.username }
      });
    }

    // Create order
    if (pathname === '/api/orders') {
      const { productId, playerId, playerName } = body;
      
      if (!productId || !playerId || !playerName) {
        return NextResponse.json(
          { success: false, error: 'Eksik bilgi' },
          { status: 400 }
        );
      }

      // Get product
      const product = await db.collection('products').findOne({ id: productId });
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Ürün bulunamadı' },
          { status: 404 }
        );
      }

      // Create order
      const order = {
        id: uuidv4(),
        productId,
        productTitle: product.title,
        playerId,
        playerName,
        status: 'pending',
        amount: product.discountPrice,
        currency: 'TRY',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('orders').insertOne(order);

      // Generate mock Shopier payment URL
      const paymentUrl = `/payment/shopier?orderId=${order.id}&amount=${order.amount}`;

      return NextResponse.json({
        success: true,
        data: {
          order,
          paymentUrl
        }
      });
    }

    // Mock Shopier callback
    if (pathname === '/api/payment/shopier/callback') {
      const { orderId, status, transactionId } = body;
      
      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // Update order status
      await db.collection('orders').updateOne(
        { id: orderId },
        {
          $set: {
            status: status === 'success' ? 'paid' : 'failed',
            updatedAt: new Date()
          }
        }
      );

      // Create payment record
      await db.collection('payments').insertOne({
        id: uuidv4(),
        orderId,
        provider: 'shopier',
        providerTxnId: transactionId || uuidv4(),
        rawPayload: body,
        verifiedAt: new Date(),
        createdAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Ödeme işlendi'
      });
    }

    // Admin: Create product
    if (pathname === '/api/admin/products') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const product = {
        id: uuidv4(),
        ...body,
        createdAt: new Date()
      };

      await db.collection('products').insertOne(product);
      
      return NextResponse.json({
        success: true,
        data: product
      });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint bulunamadı' },
      { status: 404 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const { pathname } = new URL(request.url);
  
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const body = await request.json();

    // Update product
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+$/)) {
      const productId = pathname.split('/').pop();
      
      await db.collection('products').updateOne(
        { id: productId },
        { $set: { ...body, updatedAt: new Date() } }
      );

      const updated = await db.collection('products').findOne({ id: productId });
      
      return NextResponse.json({
        success: true,
        data: updated
      });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint bulunamadı' },
      { status: 404 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url);
  
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

    const db = await getDb();

    // Delete product (soft delete - set active to false)
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+$/)) {
      const productId = pathname.split('/').pop();
      
      await db.collection('products').updateOne(
        { id: productId },
        { $set: { active: false, updatedAt: new Date() } }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Ürün silindi'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint bulunamadı' },
      { status: 404 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}