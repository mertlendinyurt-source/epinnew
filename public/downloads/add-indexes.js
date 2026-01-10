// MongoDB Index Ekleme Scripti
// Kullanım: node add-indexes.js

const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://admindata:Can123qwe1@cluster0.yabcdy2.mongodb.net/pinly_store?retryWrites=true&w=majority';
const DB_NAME = 'pinly_store';

async function addIndexes() {
  console.log('MongoDB\'ye bağlanılıyor...');
  
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);
  
  console.log('Index\'ler ekleniyor...\n');

  try {
    // PRODUCTS Collection
    console.log('📦 Products index\'leri...');
    await db.collection('products').createIndex({ id: 1 }, { unique: true });
    await db.collection('products').createIndex({ active: 1 });
    await db.collection('products').createIndex({ order: 1 });
    await db.collection('products').createIndex({ active: 1, order: 1 });
    console.log('   ✅ Products tamamlandı\n');

    // ORDERS Collection
    console.log('🛒 Orders index\'leri...');
    await db.collection('orders').createIndex({ id: 1 }, { unique: true });
    await db.collection('orders').createIndex({ oderId: 1 });
    await db.collection('orders').createIndex({ oderId: 1 });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ userId: 1 });
    await db.collection('orders').createIndex({ userEmail: 1 });
    await db.collection('orders').createIndex({ 'delivery.status': 1 });
    await db.collection('orders').createIndex({ status: 1, createdAt: -1 });
    console.log('   ✅ Orders tamamlandı\n');

    // USERS Collection
    console.log('👤 Users index\'leri...');
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ role: 1 });
    console.log('   ✅ Users tamamlandı\n');

    // ACCOUNTS Collection
    console.log('🎮 Accounts index\'leri...');
    await db.collection('accounts').createIndex({ id: 1 }, { unique: true });
    await db.collection('accounts').createIndex({ active: 1 });
    await db.collection('accounts').createIndex({ status: 1 });
    await db.collection('accounts').createIndex({ order: 1 });
    console.log('   ✅ Accounts tamamlandı\n');

    // ACCOUNT_STOCK Collection
    console.log('📋 Account Stock index\'leri...');
    await db.collection('account_stock').createIndex({ id: 1 }, { unique: true });
    await db.collection('account_stock').createIndex({ accountId: 1 });
    await db.collection('account_stock').createIndex({ status: 1 });
    await db.collection('account_stock').createIndex({ accountId: 1, status: 1 });
    console.log('   ✅ Account Stock tamamlandı\n');

    // SUPPORT_TICKETS Collection
    console.log('🎫 Support Tickets index\'leri...');
    await db.collection('support_tickets').createIndex({ id: 1 }, { unique: true });
    await db.collection('support_tickets').createIndex({ oderId: 1 });
    await db.collection('support_tickets').createIndex({ status: 1 });
    await db.collection('support_tickets').createIndex({ updatedAt: -1 });
    console.log('   ✅ Support Tickets tamamlandı\n');

    // REVIEWS Collection
    console.log('⭐ Reviews index\'leri...');
    await db.collection('reviews').createIndex({ id: 1 }, { unique: true });
    await db.collection('reviews').createIndex({ approved: 1 });
    await db.collection('reviews').createIndex({ createdAt: -1 });
    await db.collection('reviews').createIndex({ approved: 1, createdAt: -1 });
    console.log('   ✅ Reviews tamamlandı\n');

    // BLOG_POSTS Collection
    console.log('📝 Blog Posts index\'leri...');
    await db.collection('blog_posts').createIndex({ id: 1 }, { unique: true });
    await db.collection('blog_posts').createIndex({ slug: 1 }, { unique: true });
    await db.collection('blog_posts').createIndex({ status: 1 });
    await db.collection('blog_posts').createIndex({ publishedAt: -1 });
    console.log('   ✅ Blog Posts tamamlandı\n');

    // SETTINGS Collection
    console.log('⚙️ Settings index\'leri...');
    await db.collection('settings').createIndex({ key: 1 }, { unique: true });
    console.log('   ✅ Settings tamamlandı\n');

    // SMS_LOGS Collection
    console.log('📱 SMS Logs index\'leri...');
    await db.collection('sms_logs').createIndex({ id: 1 });
    await db.collection('sms_logs').createIndex({ createdAt: -1 });
    await db.collection('sms_logs').createIndex({ phone: 1 });
    console.log('   ✅ SMS Logs tamamlandı\n');

    // AUDIT_LOGS Collection
    console.log('📜 Audit Logs index\'leri...');
    await db.collection('audit_logs').createIndex({ id: 1 });
    await db.collection('audit_logs').createIndex({ createdAt: -1 });
    await db.collection('audit_logs').createIndex({ action: 1 });
    await db.collection('audit_logs').createIndex({ actorId: 1 });
    console.log('   ✅ Audit Logs tamamlandı\n');

    // BLACKLIST Collection
    console.log('🚫 Blacklist index\'leri...');
    await db.collection('blacklist').createIndex({ id: 1 }, { unique: true });
    await db.collection('blacklist').createIndex({ type: 1 });
    await db.collection('blacklist').createIndex({ value: 1 });
    await db.collection('blacklist').createIndex({ type: 1, value: 1 });
    console.log('   ✅ Blacklist tamamlandı\n');

    console.log('========================================');
    console.log('🎉 TÜM INDEX\'LER BAŞARIYLA EKLENDİ!');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await client.close();
    console.log('\nBağlantı kapatıldı.');
  }
}

addIndexes();
