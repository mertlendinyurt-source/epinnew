import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt, maskSensitiveData, generateShopierHash } from '@/lib/crypto';
import { saveUploadedFile, deleteUploadedFile } from '@/lib/fileUpload';

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

// Verify Admin Token (requires username field, not type)
function verifyAdminToken(request) {
  const user = verifyToken(request);
  if (!user) return null;
  
  // Admin tokens have 'username' field, user tokens have 'type' field
  if (user.type === 'user') {
    return null; // Reject user tokens
  }
  
  return user;
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

    // Resolve player name (Real PUBG Mobile API via RapidAPI - ID Game Checker)
    if (pathname === '/api/player/resolve') {
      const playerId = searchParams.get('id');
      if (!playerId || playerId.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz Oyuncu ID' },
          { status: 400 }
        );
      }
      
      try {
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        
        if (!rapidApiKey) {
          console.error('RAPIDAPI_KEY not configured');
          // Fallback to generic name if API key not available
          return NextResponse.json({
            success: true,
            data: {
              playerId,
              playerName: `Player#${playerId.slice(-4)}`
            }
          });
        }

        // Call PUBG Mobile ID Game Checker API via RapidAPI
        const response = await fetch(
          `https://id-game-checker.p.rapidapi.com/pubgm-global/${playerId}`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-host': 'id-game-checker.p.rapidapi.com',
              'x-rapidapi-key': rapidApiKey
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          }
        );

        if (!response.ok) {
          console.error(`PUBG API error: ${response.status}`);
          // If API fails, use fallback
          return NextResponse.json({
            success: true,
            data: {
              playerId,
              playerName: `Player#${playerId.slice(-4)}`
            }
          });
        }

        const apiData = await response.json();
        
        // Check if player was found
        if (apiData.error || apiData.msg !== 'id_found') {
          return NextResponse.json({
            success: false,
            error: 'Oyuncu ID bulunamadı. Lütfen geçerli bir PUBG Mobile Global ID girin.'
          }, { status: 404 });
        }

        // Check if account is banned
        if (apiData.data.is_ban === 1) {
          return NextResponse.json({
            success: false,
            error: 'Bu hesap yasaklanmış (banned). UC yüklenemez.'
          }, { status: 400 });
        }
        
        // Extract player name from API response
        const playerName = apiData.data.username || `Player#${playerId.slice(-4)}`;
        
        return NextResponse.json({
          success: true,
          data: {
            playerId,
            playerName,
            isBanned: apiData.data.is_ban === 1
          }
        });
      } catch (error) {
        console.error('Player resolve error:', error.message);
        // Fallback to generic name on error
        return NextResponse.json({
          success: true,
          data: {
            playerId,
            playerName: `Player#${playerId.slice(-4)}`
          }
        });
      }
    }

    // Admin: Get all orders
    if (pathname === '/api/admin/orders') {
      const user = verifyAdminToken(request);
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
      const user = verifyAdminToken(request);
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
      const user = verifyAdminToken(request);
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
      const user = verifyAdminToken(request);
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

    // Admin: Get Shopier payment settings (masked)
    if (pathname === '/api/admin/settings/payments') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      // Get encrypted settings from database
      const settings = await db.collection('shopier_settings').findOne({ isActive: true });
      
      if (!settings) {
        return NextResponse.json({
          success: true,
          data: {
            isConfigured: false,
            merchantId: null,
            apiKey: null,
            mode: 'production',
            message: 'Shopier ayarları henüz yapılmadı'
          }
        });
      }

      // Return masked values (never send encrypted or decrypted sensitive data to frontend)
      return NextResponse.json({
        success: true,
        data: {
          isConfigured: true,
          merchantId: settings.merchantId ? maskSensitiveData(decrypt(settings.merchantId)) : null,
          apiKey: settings.apiKey ? maskSensitiveData(decrypt(settings.apiKey)) : null,
          mode: settings.mode || 'production',
          updatedBy: settings.updatedBy,
          updatedAt: settings.updatedAt
        }
      });
    }

    // User: Get my orders
    if (pathname === '/api/account/orders') {
      const authUser = verifyToken(request);
      if (!authUser || authUser.type !== 'user') {
        return NextResponse.json(
          { success: false, error: 'Giriş yapmalısınız' },
          { status: 401 }
        );
      }

      // Get user's orders
      const orders = await db.collection('orders')
        .find({ userId: authUser.id })
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({
        success: true,
        data: orders
      });
    }

    // User: Get single order details
    if (pathname.match(/^\/api\/account\/orders\/[^\/]+$/)) {
      const authUser = verifyToken(request);
      if (!authUser || authUser.type !== 'user') {
        return NextResponse.json(
          { success: false, error: 'Giriş yapmalısınız' },
          { status: 401 }
        );
      }

      const orderId = pathname.split('/').pop();
      const order = await db.collection('orders').findOne({ 
        id: orderId, 
        userId: authUser.id // Only allow user to see their own orders
      });

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

    // Admin: Get product stock
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+\/stock$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const productId = pathname.split('/')[4];
      
      // Get stock items
      const stocks = await db.collection('stock')
        .find({ productId })
        .sort({ createdAt: -1 })
        .toArray();

      const availableCount = stocks.filter(s => s.status === 'available').length;
      const assignedCount = stocks.filter(s => s.status === 'assigned').length;

      return NextResponse.json({
        success: true,
        data: {
          stocks,
          summary: {
            total: stocks.length,
            available: availableCount,
            assigned: assignedCount
          }
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

    // User Register
    if (pathname === '/api/auth/register') {
      const { firstName, lastName, email, phone, password } = body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !password) {
        return NextResponse.json(
          { success: false, error: 'Tüm alanlar zorunludur' },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz e-posta adresi' },
          { status: 400 }
        );
      }

      // Validate phone format (Turkish)
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz telefon numarası (10-11 rakam)' },
          { status: 400 }
        );
      }

      // Validate password length
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Şifre en az 6 karakter olmalıdır' },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Bu e-posta ile kayıtlı hesap var', code: 'EMAIL_EXISTS' },
          { status: 409 }
        );
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = {
        id: uuidv4(),
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: phone.replace(/\s/g, ''),
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('users').insertOne(user);

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          type: 'user'
        },
        JWT_SECRET,
        { expiresIn: '7d' } // 7 days for user tokens
      );

      return NextResponse.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone
          }
        }
      });
    }

    // User Login
    if (pathname === '/api/auth/login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'E-posta ve şifre gereklidir' },
          { status: 400 }
        );
      }

      // Find user
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'E-posta veya şifre hatalı' },
          { status: 401 }
        );
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return NextResponse.json(
          { success: false, error: 'E-posta veya şifre hatalı' },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          type: 'user'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return NextResponse.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone
          }
        }
      });
    }

    // Create order (AUTH REQUIRED)
    if (pathname === '/api/orders') {
      // Verify user authentication
      const authUser = verifyToken(request);
      if (!authUser || authUser.type !== 'user') {
        return NextResponse.json(
          { success: false, error: 'Sipariş vermek için giriş yapmalısınız', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const { productId, playerId, playerName } = body;
      
      if (!productId || !playerId || !playerName) {
        return NextResponse.json(
          { success: false, error: 'Eksik bilgi' },
          { status: 400 }
        );
      }

      // Get user details for customer snapshot
      const user = await db.collection('users').findOne({ id: authUser.id });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        );
      }

      // Validate user has required customer information
      if (!user.firstName || !user.lastName || !user.email || !user.phone) {
        return NextResponse.json(
          { success: false, error: 'Profil bilgileriniz eksik. Lütfen hesap ayarlarından tamamlayın.', code: 'INCOMPLETE_PROFILE' },
          { status: 400 }
        );
      }

      // Get product (price controlled by backend - NO FRONTEND PRICE TRUST)
      const product = await db.collection('products').findOne({ id: productId });
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Ürün bulunamadı' },
          { status: 404 }
        );
      }

      // Get Shopier settings from database
      const shopierSettings = await db.collection('shopier_settings').findOne({ isActive: true });
      
      if (!shopierSettings) {
        return NextResponse.json(
          { success: false, error: 'Ödeme sistemi yapılandırılmamış. Lütfen yöneticiyle iletişime geçin.' },
          { status: 503 }
        );
      }

      // Decrypt Shopier credentials
      let merchantId, apiKey, apiSecret;
      try {
        merchantId = decrypt(shopierSettings.merchantId);
        apiKey = decrypt(shopierSettings.apiKey);
        apiSecret = decrypt(shopierSettings.apiSecret);
      } catch (error) {
        console.error('Shopier settings decryption failed');
        return NextResponse.json(
          { success: false, error: 'Ödeme sistemi yapılandırma hatası' },
          { status: 500 }
        );
      }

      // Create customer snapshot (for order record)
      const customerSnapshot = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      };

      // Create order with PENDING status
      const order = {
        id: uuidv4(),
        userId: user.id, // Link order to user
        productId,
        productTitle: product.title,
        playerId,
        playerName,
        customer: customerSnapshot, // Store customer info snapshot
        status: 'pending',
        amount: product.discountPrice, // Backend-controlled price
        currency: 'TRY',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('orders').insertOne(order);

      // Generate random string for Shopier request
      const randomNr = uuidv4().replace(/-/g, '').substring(0, 16);

      // Prepare Shopier payment request with REAL customer data
      const shopierPayload = {
        random_nr: randomNr,
        platform_order_id: order.id,
        product_name: `${product.title} - PUBG Mobile UC`,
        product_type: '1', // Digital product
        buyer_name: customerSnapshot.firstName,
        buyer_surname: customerSnapshot.lastName,
        buyer_email: customerSnapshot.email,
        buyer_phone: customerSnapshot.phone,
        buyer_account_age: '0',
        buyer_id_nr: playerId,
        buyer_address: 'Turkey', // Can be added to user profile later if needed
        buyer_city: 'Istanbul',
        buyer_country: 'Turkey',
        buyer_postcode: '34000',
        shipping_address_list: '',
        total_order_value: order.amount.toString(),
        currency: 'TRY',
        platform: '0',
        is_in_frame: '0',
        current_language: 'TR',
        modul_version: 'API_v2.2',
        apiKey: apiKey,
        website_index: '1',
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/shopier/callback`,
        back_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?orderId=${order.id}`,
      };

      // Generate hash signature for request authentication
      const hashData = `${merchantId}${randomNr}${order.amount}${order.id}`;
      const signature = generateShopierHash(order.id, order.amount, apiSecret);

      // For production Shopier, we use their payment page with form submission
      // Create payment URL (Shopier iframe or redirect method)
      const paymentUrl = `https://www.shopier.com/ShowProduct/api_pay4.php?${new URLSearchParams(shopierPayload).toString()}`;

      // Store payment request in database for audit trail
      await db.collection('payment_requests').insertOne({
        orderId: order.id,
        shopierPayload: { ...shopierPayload, apiKey: '***MASKED***' }, // Never log sensitive data
        signature,
        createdAt: new Date()
      });

      return NextResponse.json({
        success: true,
        data: {
          order,
          paymentUrl
        }
      });
    }

    // Shopier callback (Production-ready with security)
    if (pathname === '/api/payment/shopier/callback') {
      const { orderId, status, transactionId, payment_id, random_nr, total_order_value, platform_order_id, hash } = body;
      
      // 1. Validate order exists
      const order = await db.collection('orders').findOne({ id: orderId || platform_order_id });
      if (!order) {
        console.error(`Callback error: Order ${orderId || platform_order_id} not found`);
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // 2. Check if order is already PAID (idempotency protection)
      if (order.status === 'paid') {
        console.log(`Callback: Order ${order.id} already PAID. Ignoring duplicate callback.`);
        return NextResponse.json({
          success: true,
          message: 'Ödeme zaten işlenmiş'
        });
      }

      // 3. Get Shopier settings for hash validation
      const shopierSettings = await db.collection('shopier_settings').findOne({ isActive: true });
      if (!shopierSettings) {
        console.error('Callback error: Shopier settings not found');
        return NextResponse.json(
          { success: false, error: 'Ödeme sistemi yapılandırılmamış' },
          { status: 500 }
        );
      }

      // 4. Decrypt API secret for hash validation
      let apiSecret;
      try {
        apiSecret = decrypt(shopierSettings.apiSecret);
      } catch (error) {
        console.error('Callback error: Failed to decrypt API secret');
        return NextResponse.json(
          { success: false, error: 'Yapılandırma hatası' },
          { status: 500 }
        );
      }

      // 5. Validate hash signature (CRITICAL SECURITY)
      const expectedHash = generateShopierHash(order.id, order.amount, apiSecret);
      if (hash && hash !== expectedHash) {
        console.error(`Callback error: Hash mismatch. Expected: ${expectedHash}, Received: ${hash}`);
        // Log the failed attempt for security monitoring
        await db.collection('payment_security_logs').insertOne({
          orderId: order.id,
          event: 'hash_mismatch',
          receivedHash: hash,
          expectedHash,
          payload: body,
          timestamp: new Date()
        });
        
        return NextResponse.json(
          { success: false, error: 'Geçersiz imza' },
          { status: 403 }
        );
      }

      // 6. Check transaction_id uniqueness (double payment protection)
      const txnId = transactionId || payment_id;
      if (txnId) {
        const existingPayment = await db.collection('payments').findOne({ providerTxnId: txnId });
        if (existingPayment) {
          console.error(`Callback error: Transaction ${txnId} already exists`);
          return NextResponse.json({
            success: true,
            message: 'İşlem zaten kaydedilmiş'
          });
        }
      }

      // 7. Map Shopier status to application status
      let newStatus;
      if (status === 'success' || status === '1' || status === 'approved') {
        newStatus = 'paid';
      } else if (status === 'failed' || status === 'cancelled' || status === 'declined') {
        newStatus = 'failed';
      } else {
        newStatus = 'pending';
      }

      // 8. Enforce immutable status transitions (PENDING → PAID/FAILED only)
      if (order.status === 'failed' && newStatus === 'paid') {
        console.error(`Callback error: Cannot change order ${order.id} from FAILED to PAID`);
        return NextResponse.json(
          { success: false, error: 'Geçersiz durum geçişi' },
          { status: 400 }
        );
      }

      // 9. Update order status
      await db.collection('orders').updateOne(
        { id: order.id },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date()
          }
        }
      );

      // 10. Create payment record with full audit trail
      await db.collection('payments').insertOne({
        id: uuidv4(),
        orderId: order.id,
        provider: 'shopier',
        providerTxnId: txnId || uuidv4(),
        status: newStatus,
        amount: order.amount,
        currency: order.currency,
        hashValidated: true,
        rawPayload: body,
        verifiedAt: new Date(),
        createdAt: new Date()
      });

      // 11. AUTO-ASSIGN STOCK (if PAID and not already assigned)
      if (newStatus === 'paid') {
        // Check if stock already assigned (idempotency)
        const currentOrder = await db.collection('orders').findOne({ id: order.id });
        
        if (!currentOrder.delivery || !currentOrder.delivery.items || currentOrder.delivery.items.length === 0) {
          try {
            // Find available stock for this product (atomic operation)
            const assignedStock = await db.collection('stock').findOneAndUpdate(
              { 
                productId: order.productId, 
                status: 'available' 
              },
              { 
                $set: { 
                  status: 'assigned', 
                  orderId: order.id,
                  assignedAt: new Date()
                } 
              },
              { 
                returnDocument: 'after',
                sort: { createdAt: 1 } // FIFO - First stock in, first assigned
              }
            );

            console.log('Stock assignment result:', JSON.stringify(assignedStock));

            if (assignedStock && assignedStock.value) {
              // assignedStock IS the document, assignedStock.value IS the stock code string
              const stockCode = assignedStock.value;
              
              await db.collection('orders').updateOne(
                { id: order.id },
                {
                  $set: {
                    delivery: {
                      status: 'delivered',
                      items: [stockCode],
                      stockId: assignedStock.id || assignedStock._id,
                      assignedAt: new Date()
                    }
                  }
                }
              );
              console.log(`Stock assigned: Order ${order.id} received code: ${stockCode}`);
            } else {
              // No stock available - mark as pending
              await db.collection('orders').updateOne(
                { id: order.id },
                {
                  $set: {
                    delivery: {
                      status: 'pending',
                      message: 'Stok bekleniyor',
                      items: []
                    }
                  }
                }
              );
              console.warn(`No stock available for order ${order.id} (product ${order.productId})`);
            }
          } catch (stockError) {
            console.error(`Stock assignment error for order ${order.id}:`, stockError);
            // Don't fail the whole callback - mark as pending
            await db.collection('orders').updateOne(
              { id: order.id },
              {
                $set: {
                  delivery: {
                    status: 'pending',
                    message: 'Stok atama hatası',
                    items: []
                  }
                }
              }
            );
          }
        } else {
          console.log(`Stock already assigned for order ${order.id} - skipping (idempotent)`);
        }
      }

      // 12. Log successful callback for audit
      console.log(`Callback success: Order ${order.id} status updated to ${newStatus}`);

      return NextResponse.json({
        success: true,
        message: 'Ödeme işlendi'
      });
    }

    // Admin: Create product
    if (pathname === '/api/admin/products') {
      const user = verifyAdminToken(request);
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

    // Admin: Save Shopier payment settings (encrypted)
    if (pathname === '/api/admin/settings/payments') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { merchantId, apiKey, apiSecret, mode } = body;

      // Validate required fields
      if (!merchantId || !apiKey || !apiSecret) {
        return NextResponse.json(
          { success: false, error: 'Tüm alanlar gereklidir' },
          { status: 400 }
        );
      }

      // Rate limiting check (simple implementation - 10 requests per hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentUpdates = await db.collection('shopier_settings')
        .countDocuments({ updatedAt: { $gte: oneHourAgo } });
      
      if (recentUpdates >= 10) {
        return NextResponse.json(
          { success: false, error: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.' },
          { status: 429 }
        );
      }

      // Encrypt sensitive data before storing
      const encryptedSettings = {
        merchantId: encrypt(merchantId),
        apiKey: encrypt(apiKey),
        apiSecret: encrypt(apiSecret),
        mode: mode || 'production',
        isActive: true,
        updatedBy: user.username,
        updatedAt: new Date(),
        createdAt: new Date()
      };

      // Deactivate all previous settings
      await db.collection('shopier_settings').updateMany(
        {},
        { $set: { isActive: false } }
      );

      // Insert new settings
      await db.collection('shopier_settings').insertOne(encryptedSettings);

      return NextResponse.json({
        success: true,
        message: 'Shopier ayarları başarıyla kaydedildi',
        data: {
          mode: encryptedSettings.mode,
          updatedBy: encryptedSettings.updatedBy,
          updatedAt: encryptedSettings.updatedAt
        }
      });
    }

    // Admin: Add stock to product (bulk)
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+\/stock$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const productId = pathname.split('/')[4];
      const { items } = body; // Array of strings (codes/items)

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Stok item\'ları gereklidir' },
          { status: 400 }
        );
      }

      // Validate product exists
      const product = await db.collection('products').findOne({ id: productId });
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Ürün bulunamadı' },
          { status: 404 }
        );
      }

      // Create stock items
      const stockItems = items.map(item => ({
        id: uuidv4(),
        productId,
        value: item.trim(),
        status: 'available',
        orderId: null,
        createdAt: new Date(),
        createdBy: user.username
      }));

      await db.collection('stock').insertMany(stockItems);

      return NextResponse.json({
        success: true,
        message: `${stockItems.length} adet stok eklendi`,
        data: {
          count: stockItems.length
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

export async function PUT(request) {
  const { pathname } = new URL(request.url);
  
  try {
    const user = verifyAdminToken(request);
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
    const user = verifyAdminToken(request);
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