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
  
  // Migrate existing products: rename 'image' to 'imageUrl'
  await db.collection('products').updateMany(
    { image: { $exists: true }, imageUrl: { $exists: false } },
    { $rename: { image: 'imageUrl' } }
  );
  
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
        imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
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
        imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=300&fit=crop',
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
        imageUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=400&h=300&fit=crop',
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
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
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
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
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

    // Admin: Get site settings
    if (pathname === '/api/admin/settings/site') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const settings = await db.collection('site_settings').findOne({ active: true });
      
      return NextResponse.json({
        success: true,
        data: settings || {
          logo: null,
          favicon: null,
          heroImage: null,
          categoryIcon: null,
          active: true
        }
      });
    }

    // Public: Get site settings (for frontend)
    if (pathname === '/api/site/settings') {
      const settings = await db.collection('site_settings').findOne({ active: true });
      
      return NextResponse.json({
        success: true,
        data: {
          logo: settings?.logo || null,
          favicon: settings?.favicon || null,
          heroImage: settings?.heroImage || null,
          categoryIcon: settings?.categoryIcon || null
        }
      });
    }

    // Public: Get enabled regions (for frontend filter)
    if (pathname === '/api/regions') {
      let regions = await db.collection('regions').find({ enabled: true }).sort({ sortOrder: 1 }).toArray();
      
      // If no regions exist, return default regions
      if (regions.length === 0) {
        regions = [
          { id: 'tr', code: 'TR', name: 'Türkiye', enabled: true, flagImageUrl: null, sortOrder: 1 },
          { id: 'global', code: 'GLOBAL', name: 'Küresel', enabled: true, flagImageUrl: null, sortOrder: 2 },
          { id: 'de', code: 'DE', name: 'Almanya', enabled: true, flagImageUrl: null, sortOrder: 3 },
          { id: 'fr', code: 'FR', name: 'Fransa', enabled: true, flagImageUrl: null, sortOrder: 4 },
          { id: 'jp', code: 'JP', name: 'Japonya', enabled: true, flagImageUrl: null, sortOrder: 5 }
        ];
      }
      
      return NextResponse.json({ success: true, data: regions });
    }

    // Admin: Get all regions (including disabled)
    if (pathname === '/api/admin/settings/regions') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      let regions = await db.collection('regions').find({}).sort({ sortOrder: 1 }).toArray();
      
      // If no regions exist, initialize with defaults
      if (regions.length === 0) {
        const defaultRegions = [
          { id: uuidv4(), code: 'TR', name: 'Türkiye', enabled: true, flagImageUrl: null, sortOrder: 1, createdAt: new Date() },
          { id: uuidv4(), code: 'GLOBAL', name: 'Küresel', enabled: true, flagImageUrl: null, sortOrder: 2, createdAt: new Date() },
          { id: uuidv4(), code: 'DE', name: 'Almanya', enabled: true, flagImageUrl: null, sortOrder: 3, createdAt: new Date() },
          { id: uuidv4(), code: 'FR', name: 'Fransa', enabled: true, flagImageUrl: null, sortOrder: 4, createdAt: new Date() },
          { id: uuidv4(), code: 'JP', name: 'Japonya', enabled: true, flagImageUrl: null, sortOrder: 5, createdAt: new Date() }
        ];
        await db.collection('regions').insertMany(defaultRegions);
        regions = defaultRegions;
      }
      
      return NextResponse.json({ success: true, data: regions });
    }

    // Public: Get game content (description, etc.)
    if (pathname === '/api/content/pubg') {
      let content = await db.collection('game_content').findOne({ game: 'pubg' });
      
      // Default content if not exists
      if (!content) {
        content = {
          game: 'pubg',
          title: 'PUBG Mobile',
          description: `# PUBG Mobile UC Satın Al

PUBG Mobile, dünyanın en popüler battle royale oyunlarından biridir. Unknown Cash (UC), oyun içi para birimidir ve çeşitli kozmetik eşyalar, silah skinleri ve Royale Pass satın almak için kullanılır.

## UC ile Neler Yapabilirsiniz?

- **Royale Pass**: Her sezon yeni Royale Pass satın alarak özel ödüller kazanın
- **Silah Skinleri**: Nadir ve efsanevi silah görünümleri
- **Karakter Kıyafetleri**: Karakterinizi özelleştirin
- **Araç Skinleri**: Benzersiz araç görünümleri
- **Emote ve Danslar**: Eğlenceli hareketler

## Neden Bizi Tercih Etmelisiniz?

✓ **Anında Teslimat**: Ödeme onaylandıktan sonra kodunuz anında teslim edilir
✓ **Güvenli Ödeme**: SSL şifrelemeli güvenli ödeme altyapısı
✓ **7/24 Destek**: Her zaman yanınızdayız
✓ **En Uygun Fiyat**: Piyasadaki en rekabetçi fiyatlar

## Nasıl Kullanılır?

1. Satın almak istediğiniz UC paketini seçin
2. PUBG Mobile oyuncu ID'nizi girin
3. Ödemenizi tamamlayın
4. Kodunuz anında hesabınıza tanımlanır

---

*Not: Bu site PUBG Mobile veya Tencent Games ile resmi bir bağlantısı yoktur.*`,
          defaultRating: 5.0,
          defaultReviewCount: 2008,
          updatedAt: new Date()
        };
      }
      
      return NextResponse.json({ success: true, data: content });
    }

    // Public: Get reviews with pagination
    if (pathname === '/api/reviews') {
      const game = searchParams.get('game') || 'pubg';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '5');
      const skip = (page - 1) * limit;

      const reviews = await db.collection('reviews')
        .find({ game, approved: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalReviews = await db.collection('reviews').countDocuments({ game, approved: true });
      
      // Calculate average rating
      const ratingAgg = await db.collection('reviews').aggregate([
        { $match: { game, approved: true } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]).toArray();

      let avgRating = 5.0;
      let reviewCount = 0;
      
      if (ratingAgg.length > 0 && ratingAgg[0].count > 0) {
        avgRating = Math.round(ratingAgg[0].avgRating * 10) / 10;
        reviewCount = ratingAgg[0].count;
      } else {
        // Use defaults from content if no reviews
        const content = await db.collection('game_content').findOne({ game });
        if (content) {
          avgRating = content.defaultRating || 5.0;
          reviewCount = content.defaultReviewCount || 0;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          reviews,
          pagination: {
            page,
            limit,
            total: totalReviews,
            totalPages: Math.ceil(totalReviews / limit),
            hasMore: skip + reviews.length < totalReviews
          },
          stats: {
            avgRating,
            reviewCount: reviewCount || totalReviews
          }
        }
      });
    }

    // Admin: Get all reviews (including unapproved)
    if (pathname === '/api/admin/reviews') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const game = searchParams.get('game') || 'pubg';
      const reviews = await db.collection('reviews')
        .find({ game })
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({ success: true, data: reviews });
    }

    // Admin: Get game content
    if (pathname === '/api/admin/content/pubg') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      let content = await db.collection('game_content').findOne({ game: 'pubg' });
      
      if (!content) {
        content = {
          game: 'pubg',
          title: 'PUBG Mobile',
          description: '',
          defaultRating: 5.0,
          defaultReviewCount: 2008
        };
      }

      return NextResponse.json({ success: true, data: content });
    }

    // Public: Get legal page by slug
    if (pathname.match(/^\/api\/legal\/[^\/]+$/)) {
      const slug = pathname.split('/').pop();
      const page = await db.collection('legal_pages').findOne({ slug, isActive: true });
      
      if (!page) {
        return NextResponse.json(
          { success: false, error: 'Sayfa bulunamadı' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: page });
    }

    // Public: Get footer settings
    if (pathname === '/api/footer-settings') {
      let settings = await db.collection('footer_settings').findOne({ active: true });
      
      // Return defaults if no settings exist
      if (!settings) {
        settings = {
          quickLinks: [
            { label: 'Giriş Yap', action: 'login' },
            { label: 'Kayıt Ol', action: 'register' }
          ],
          categories: [
            { label: 'PUBG Mobile', url: '/' }
          ],
          corporateLinks: []
        };
        
        // Get active legal pages for corporate links
        const legalPages = await db.collection('legal_pages').find({ isActive: true }).sort({ order: 1 }).toArray();
        settings.corporateLinks = legalPages.map(p => ({ label: p.title, slug: p.slug }));
      }
      
      return NextResponse.json({ success: true, data: settings });
    }

    // Admin: Get all legal pages
    if (pathname === '/api/admin/legal-pages') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const pages = await db.collection('legal_pages').find({}).sort({ order: 1, createdAt: -1 }).toArray();
      return NextResponse.json({ success: true, data: pages });
    }

    // Admin: Get footer settings
    if (pathname === '/api/admin/footer-settings') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      let settings = await db.collection('footer_settings').findOne({ active: true });
      
      if (!settings) {
        settings = {
          quickLinks: [
            { label: 'Giriş Yap', action: 'login' },
            { label: 'Kayıt Ol', action: 'register' }
          ],
          categories: [
            { label: 'PUBG Mobile', url: '/' }
          ],
          corporateLinks: []
        };
      }
      
      return NextResponse.json({ success: true, data: settings });
    }

    // User: Get my profile
    if (pathname === '/api/account/me') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      // Token has 'id' field for user ID
      const userId = userData.id || userData.userId;
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        );
      }

      // Get order statistics
      const orderCount = await db.collection('orders').countDocuments({ userId: user.id });
      const lastOrder = await db.collection('orders')
        .findOne({ userId: user.id }, { sort: { createdAt: -1 } });

      return NextResponse.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          createdAt: user.createdAt,
          stats: {
            totalOrders: orderCount,
            lastOrderDate: lastOrder?.createdAt || null,
            lastOrderStatus: lastOrder?.status || null
          }
        }
      });
    }

    // User: Get my recent orders (for dashboard)
    if (pathname === '/api/account/orders/recent') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const userId = userData.id || userData.userId;
      const orders = await db.collection('orders')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      return NextResponse.json({ success: true, data: orders });
    }

    // User: Get my support tickets
    if (pathname === '/api/support/tickets') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const userId = userData.id || userData.userId;
      const tickets = await db.collection('tickets')
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();

      return NextResponse.json({ success: true, data: tickets });
    }

    // User: Get single ticket with messages
    if (pathname.match(/^\/api\/support\/tickets\/[^\/]+$/)) {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const ticketId = pathname.split('/').pop();
      const userId = userData.id || userData.userId;
      
      const ticket = await db.collection('tickets').findOne({ id: ticketId, userId });
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Talep bulunamadı' },
          { status: 404 }
        );
      }

      const messages = await db.collection('ticket_messages')
        .find({ ticketId })
        .sort({ createdAt: 1 })
        .toArray();

      return NextResponse.json({ 
        success: true, 
        data: { ticket, messages } 
      });
    }

    // Admin: Get all support tickets
    if (pathname === '/api/admin/support/tickets') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const status = searchParams.get('status');
      const query = status ? { status } : {};
      
      const tickets = await db.collection('tickets')
        .find(query)
        .sort({ updatedAt: -1 })
        .toArray();

      // Get user info for each ticket
      const userIds = [...new Set(tickets.map(t => t.userId))];
      const users = await db.collection('users')
        .find({ id: { $in: userIds } })
        .toArray();
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      const ticketsWithUser = tickets.map(t => ({
        ...t,
        userEmail: userMap[t.userId]?.email || 'Bilinmiyor',
        userName: userMap[t.userId] 
          ? `${userMap[t.userId].firstName || ''} ${userMap[t.userId].lastName || ''}`.trim() || userMap[t.userId].email
          : 'Bilinmiyor'
      }));

      return NextResponse.json({ success: true, data: ticketsWithUser });
    }

    // Admin: Get single ticket with messages
    if (pathname.match(/^\/api\/admin\/support\/tickets\/[^\/]+$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const ticketId = pathname.split('/').pop();
      const ticket = await db.collection('tickets').findOne({ id: ticketId });
      
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Talep bulunamadı' },
          { status: 404 }
        );
      }

      // Get user info
      const ticketUser = await db.collection('users').findOne({ id: ticket.userId });
      
      const messages = await db.collection('ticket_messages')
        .find({ ticketId })
        .sort({ createdAt: 1 })
        .toArray();

      return NextResponse.json({ 
        success: true, 
        data: { 
          ticket: {
            ...ticket,
            userEmail: ticketUser?.email || 'Bilinmiyor',
            userName: ticketUser 
              ? `${ticketUser.firstName || ''} ${ticketUser.lastName || ''}`.trim() || ticketUser.email
              : 'Bilinmiyor'
          },
          messages 
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
    
    // Admin: Upload file (MUST BE BEFORE body = await request.json())
    if (pathname === '/api/admin/upload') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const category = formData.get('category') || 'general';

        if (!file) {
          return NextResponse.json(
            { success: false, error: 'Dosya seçilmedi' },
            { status: 400 }
          );
        }

        const fileUrl = await saveUploadedFile(file, category);

        return NextResponse.json({
          success: true,
          data: {
            url: fileUrl,
            filename: file.name,
            size: file.size,
            type: file.type
          }
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }
    
    // For all other endpoints, parse JSON body
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
        productImageUrl: product.imageUrl || null, // Store product image for order display
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

    // Admin: Update site settings
    if (pathname === '/api/admin/settings/site') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { logo, favicon, heroImage, categoryIcon } = body;

      // Deactivate previous settings
      await db.collection('site_settings').updateMany(
        {},
        { $set: { active: false } }
      );

      // Create new settings
      const settings = {
        logo,
        favicon,
        heroImage,
        categoryIcon,
        active: true,
        updatedBy: user.username,
        updatedAt: new Date(),
        createdAt: new Date()
      };

      await db.collection('site_settings').insertOne(settings);

      return NextResponse.json({
        success: true,
        message: 'Site ayarları güncellendi',
        data: settings
      });
    }

    // User: Create support ticket
    if (pathname === '/api/support/tickets') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const userId = userData.id || userData.userId;
      const { subject, category, message } = body;

      if (!subject || !category || !message) {
        return NextResponse.json(
          { success: false, error: 'Konu, kategori ve mesaj zorunludur' },
          { status: 400 }
        );
      }

      if (subject.length < 5) {
        return NextResponse.json(
          { success: false, error: 'Konu en az 5 karakter olmalıdır' },
          { status: 400 }
        );
      }

      if (message.length < 10) {
        return NextResponse.json(
          { success: false, error: 'Mesaj en az 10 karakter olmalıdır' },
          { status: 400 }
        );
      }

      const validCategories = ['odeme', 'teslimat', 'hesap', 'diger'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz kategori' },
          { status: 400 }
        );
      }

      // Rate limit: max 3 tickets per 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentTickets = await db.collection('tickets').countDocuments({
        userId,
        createdAt: { $gte: tenMinutesAgo }
      });

      if (recentTickets >= 3) {
        return NextResponse.json(
          { success: false, error: 'Çok fazla talep oluşturdunuz. 10 dakika bekleyin.' },
          { status: 429 }
        );
      }

      // Create ticket
      const ticket = {
        id: uuidv4(),
        userId,
        subject,
        category,
        status: 'waiting_admin',
        lastMessageBy: 'user',
        userCanReply: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('tickets').insertOne(ticket);

      // Create first message
      const ticketMessage = {
        id: uuidv4(),
        ticketId: ticket.id,
        sender: 'user',
        message,
        createdAt: new Date()
      };

      await db.collection('ticket_messages').insertOne(ticketMessage);

      return NextResponse.json({
        success: true,
        message: 'Destek talebiniz oluşturuldu',
        data: ticket
      });
    }

    // User: Send message to ticket
    if (pathname.match(/^\/api\/support\/tickets\/[^\/]+\/messages$/)) {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const ticketId = pathname.split('/')[4];
      const userId = userData.id || userData.userId;
      const { message } = body;

      if (!message || message.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Mesaj en az 2 karakter olmalıdır' },
          { status: 400 }
        );
      }

      // Get ticket and verify ownership
      const ticket = await db.collection('tickets').findOne({ id: ticketId, userId });
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Talep bulunamadı' },
          { status: 404 }
        );
      }

      // Check if user can reply
      if (!ticket.userCanReply) {
        return NextResponse.json(
          { success: false, error: 'Admin yanıtı bekleniyor. Şu anda mesaj gönderemezsiniz.' },
          { status: 403 }
        );
      }

      if (ticket.status === 'closed') {
        return NextResponse.json(
          { success: false, error: 'Bu talep kapatılmış. Yeni mesaj gönderemezsiniz.' },
          { status: 403 }
        );
      }

      // Create message
      const ticketMessage = {
        id: uuidv4(),
        ticketId,
        sender: 'user',
        message,
        createdAt: new Date()
      };

      await db.collection('ticket_messages').insertOne(ticketMessage);

      // Update ticket status
      await db.collection('tickets').updateOne(
        { id: ticketId },
        {
          $set: {
            status: 'waiting_admin',
            lastMessageBy: 'user',
            userCanReply: false,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Mesajınız gönderildi',
        data: ticketMessage
      });
    }

    // Admin: Send message to ticket
    if (pathname.match(/^\/api\/admin\/support\/tickets\/[^\/]+\/messages$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const ticketId = pathname.split('/')[5];
      const { message } = body;

      if (!message || message.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Mesaj en az 2 karakter olmalıdır' },
          { status: 400 }
        );
      }

      const ticket = await db.collection('tickets').findOne({ id: ticketId });
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Talep bulunamadı' },
          { status: 404 }
        );
      }

      // Create message
      const ticketMessage = {
        id: uuidv4(),
        ticketId,
        sender: 'admin',
        adminUsername: user.username,
        message,
        createdAt: new Date()
      };

      await db.collection('ticket_messages').insertOne(ticketMessage);

      // Update ticket status - user can now reply
      await db.collection('tickets').updateOne(
        { id: ticketId },
        {
          $set: {
            status: 'waiting_user',
            lastMessageBy: 'admin',
            userCanReply: true,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Yanıt gönderildi',
        data: ticketMessage
      });
    }

    // Admin: Close ticket
    if (pathname.match(/^\/api\/admin\/support\/tickets\/[^\/]+\/close$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const ticketId = pathname.split('/')[5];

      const ticket = await db.collection('tickets').findOne({ id: ticketId });
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Talep bulunamadı' },
          { status: 404 }
        );
      }

      await db.collection('tickets').updateOne(
        { id: ticketId },
        {
          $set: {
            status: 'closed',
            userCanReply: false,
            closedBy: user.username,
            closedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Talep kapatıldı'
      });
    }

    // Admin: Save regions settings
    if (pathname === '/api/admin/settings/regions') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { regions } = body;

      if (!regions || !Array.isArray(regions)) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz region verisi' },
          { status: 400 }
        );
      }

      // Validate each region
      for (const region of regions) {
        if (!region.code || !region.name) {
          return NextResponse.json(
            { success: false, error: 'Her region için code ve name zorunludur' },
            { status: 400 }
          );
        }
      }

      // Delete all existing regions and insert new ones
      await db.collection('regions').deleteMany({});
      
      const regionsToInsert = regions.map((region, index) => ({
        id: region.id || uuidv4(),
        code: region.code,
        name: region.name,
        enabled: region.enabled !== false,
        flagImageUrl: region.flagImageUrl || null,
        sortOrder: region.sortOrder || index + 1,
        updatedBy: user.username,
        updatedAt: new Date(),
        createdAt: region.createdAt || new Date()
      }));

      if (regionsToInsert.length > 0) {
        await db.collection('regions').insertMany(regionsToInsert);
      }

      return NextResponse.json({
        success: true,
        message: 'Region ayarları güncellendi',
        data: regionsToInsert
      });
    }

    // Admin: Save game content
    if (pathname === '/api/admin/content/pubg') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { title, description, defaultRating, defaultReviewCount } = body;

      await db.collection('game_content').updateOne(
        { game: 'pubg' },
        {
          $set: {
            game: 'pubg',
            title: title || 'PUBG Mobile',
            description: description || '',
            defaultRating: defaultRating || 5.0,
            defaultReviewCount: defaultReviewCount || 0,
            updatedBy: user.username,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      const content = await db.collection('game_content').findOne({ game: 'pubg' });

      return NextResponse.json({
        success: true,
        message: 'İçerik güncellendi',
        data: content
      });
    }

    // Admin: Add review
    if (pathname === '/api/admin/reviews') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { game, userName, rating, comment, approved, customDate } = body;

      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
          { success: false, error: 'Puan 1-5 arasında olmalıdır' },
          { status: 400 }
        );
      }

      // Use custom date if provided, otherwise use current date
      const reviewDate = customDate ? new Date(customDate) : new Date();

      const review = {
        id: uuidv4(),
        game: game || 'pubg',
        userName: userName || 'Misafir',
        rating: parseInt(rating),
        comment: comment || '',
        approved: approved !== false,
        createdBy: user.username,
        createdAt: reviewDate
      };

      await db.collection('reviews').insertOne(review);

      return NextResponse.json({
        success: true,
        message: 'Yorum eklendi',
        data: review
      });
    }

    // Admin: Create legal page
    if (pathname === '/api/admin/legal-pages') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { title, slug, content, effectiveDate, isActive, order } = body;

      if (!title || !slug) {
        return NextResponse.json(
          { success: false, error: 'Başlık ve slug zorunludur' },
          { status: 400 }
        );
      }

      // Check if slug already exists
      const existing = await db.collection('legal_pages').findOne({ slug });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Bu slug zaten kullanılıyor' },
          { status: 400 }
        );
      }

      const page = {
        id: uuidv4(),
        title,
        slug,
        content: content || '',
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        isActive: isActive !== false,
        order: order || 0,
        createdBy: user.username,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('legal_pages').insertOne(page);

      return NextResponse.json({
        success: true,
        message: 'Sayfa oluşturuldu',
        data: page
      });
    }

    // Admin: Save footer settings
    if (pathname === '/api/admin/footer-settings') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { quickLinks, categories, corporateLinks } = body;

      // Deactivate previous settings
      await db.collection('footer_settings').updateMany({}, { $set: { active: false } });

      const settings = {
        id: uuidv4(),
        quickLinks: quickLinks || [],
        categories: categories || [],
        corporateLinks: corporateLinks || [],
        active: true,
        updatedBy: user.username,
        updatedAt: new Date(),
        createdAt: new Date()
      };

      await db.collection('footer_settings').insertOne(settings);

      return NextResponse.json({
        success: true,
        message: 'Footer ayarları güncellendi',
        data: settings
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
    await initializeDb();
    const db = await getDb();
    const body = await request.json();

    // User account endpoints (use user token)
    if (pathname === '/api/account/me') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const userId = userData.id || userData.userId;
      const { firstName, lastName, phone } = body;

      // Validation
      if (firstName !== undefined && firstName.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Ad en az 2 karakter olmalıdır' },
          { status: 400 }
        );
      }

      if (lastName !== undefined && lastName.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Soyad en az 2 karakter olmalıdır' },
          { status: 400 }
        );
      }

      // Phone format validation (Turkish format)
      if (phone !== undefined && phone.length > 0) {
        const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
        const cleanPhone = phone.replace(/\s/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return NextResponse.json(
            { success: false, error: 'Geçersiz telefon numarası formatı' },
            { status: 400 }
          );
        }
      }

      const updateData = { updatedAt: new Date() };
      if (firstName !== undefined) updateData.firstName = firstName.trim();
      if (lastName !== undefined) updateData.lastName = lastName.trim();
      if (phone !== undefined) updateData.phone = phone.replace(/\s/g, '');

      await db.collection('users').updateOne(
        { id: userId },
        { $set: updateData }
      );

      const updatedUser = await db.collection('users').findOne({ id: userId });

      return NextResponse.json({
        success: true,
        message: 'Profil güncellendi',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          phone: updatedUser.phone || ''
        }
      });
    }

    if (pathname === '/api/account/password') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const userId = userData.id || userData.userId;
      const { currentPassword, newPassword, confirmPassword } = body;

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Tüm alanlar zorunludur' },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Yeni şifreler eşleşmiyor' },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Yeni şifre en az 8 karakter olmalıdır' },
          { status: 400 }
        );
      }

      // Check for at least one letter and one number
      const hasLetter = /[a-zA-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      if (!hasLetter || !hasNumber) {
        return NextResponse.json(
          { success: false, error: 'Şifre en az bir harf ve bir rakam içermelidir' },
          { status: 400 }
        );
      }

      // Get user and verify current password
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Mevcut şifre yanlış' },
          { status: 400 }
        );
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.collection('users').updateOne(
        { id: userId },
        { 
          $set: { 
            passwordHash: hashedPassword,
            passwordChangedAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Şifreniz başarıyla güncellendi'
      });
    }

    // Admin endpoints (require admin token)
    const user = verifyAdminToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

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

    // Update legal page
    if (pathname.match(/^\/api\/admin\/legal-pages\/[^\/]+$/)) {
      const pageId = pathname.split('/').pop();
      
      const { title, slug, content, effectiveDate, isActive, order } = body;

      // Check if slug already exists (excluding current page)
      if (slug) {
        const existing = await db.collection('legal_pages').findOne({ slug, id: { $ne: pageId } });
        if (existing) {
          return NextResponse.json(
            { success: false, error: 'Bu slug zaten kullanılıyor' },
            { status: 400 }
          );
        }
      }

      const updateData = {
        updatedAt: new Date(),
        updatedBy: user.username
      };
      
      if (title !== undefined) updateData.title = title;
      if (slug !== undefined) updateData.slug = slug;
      if (content !== undefined) updateData.content = content;
      if (effectiveDate !== undefined) updateData.effectiveDate = new Date(effectiveDate);
      if (isActive !== undefined) updateData.isActive = isActive;
      if (order !== undefined) updateData.order = order;

      await db.collection('legal_pages').updateOne(
        { id: pageId },
        { $set: updateData }
      );

      const updated = await db.collection('legal_pages').findOne({ id: pageId });
      
      return NextResponse.json({
        success: true,
        message: 'Sayfa güncellendi',
        data: updated
      });
    }

    // User: Update my profile
    if (pathname === '/api/account/me') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const userId = userData.id || userData.userId;
      const { firstName, lastName, phone } = body;

      // Validation
      if (firstName !== undefined && firstName.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Ad en az 2 karakter olmalıdır' },
          { status: 400 }
        );
      }

      if (lastName !== undefined && lastName.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Soyad en az 2 karakter olmalıdır' },
          { status: 400 }
        );
      }

      // Phone format validation (Turkish format)
      if (phone !== undefined && phone.length > 0) {
        const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
        const cleanPhone = phone.replace(/\s/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return NextResponse.json(
            { success: false, error: 'Geçersiz telefon numarası formatı' },
            { status: 400 }
          );
        }
      }

      const updateData = { updatedAt: new Date() };
      if (firstName !== undefined) updateData.firstName = firstName.trim();
      if (lastName !== undefined) updateData.lastName = lastName.trim();
      if (phone !== undefined) updateData.phone = phone.replace(/\s/g, '');

      await db.collection('users').updateOne(
        { id: userId },
        { $set: updateData }
      );

      const updatedUser = await db.collection('users').findOne({ id: userId });

      return NextResponse.json({
        success: true,
        message: 'Profil güncellendi',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          phone: updatedUser.phone || ''
        }
      });
    }

    // User: Change password
    if (pathname === '/api/account/password') {
      const userData = verifyToken(request);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }

      const userId = userData.id || userData.userId;
      const { currentPassword, newPassword, confirmPassword } = body;

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Tüm alanlar zorunludur' },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Yeni şifreler eşleşmiyor' },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Yeni şifre en az 8 karakter olmalıdır' },
          { status: 400 }
        );
      }

      // Check for at least one letter and one number
      const hasLetter = /[a-zA-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      if (!hasLetter || !hasNumber) {
        return NextResponse.json(
          { success: false, error: 'Şifre en az bir harf ve bir rakam içermelidir' },
          { status: 400 }
        );
      }

      // Get user and verify current password
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Mevcut şifre yanlış' },
          { status: 400 }
        );
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.collection('users').updateOne(
        { id: userId },
        { 
          $set: { 
            passwordHash: hashedPassword,
            passwordChangedAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Şifreniz başarıyla güncellendi'
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

    // Delete review
    if (pathname.match(/^\/api\/admin\/reviews\/[^\/]+$/)) {
      const reviewId = pathname.split('/').pop();
      
      const result = await db.collection('reviews').deleteOne({ id: reviewId });
      
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Yorum bulunamadı' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Yorum silindi'
      });
    }

    // Delete legal page
    if (pathname.match(/^\/api\/admin\/legal-pages\/[^\/]+$/)) {
      const pageId = pathname.split('/').pop();
      
      const result = await db.collection('legal_pages').deleteOne({ id: pageId });
      
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Sayfa bulunamadı' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Sayfa silindi'
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