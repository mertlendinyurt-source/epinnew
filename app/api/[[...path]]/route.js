import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt, maskSensitiveData, generateShopierHash } from '@/lib/crypto';
import { saveUploadedFile, deleteUploadedFile } from '@/lib/fileUpload';
import nodemailer from 'nodemailer';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'pinly_store';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const APP_VERSION = '1.0.0';

// DijiPin API Configuration
const DIJIPIN_API_URL = process.env.DIJIPIN_API_URL || 'https://dijipinapi.dijipin.com';
const DIJIPIN_API_TOKEN = process.env.DIJIPIN_API_TOKEN;
const DIJIPIN_API_KEY = process.env.DIJIPIN_API_KEY;

// ============================================
// SIMPLE IN-MEMORY CACHE (60 saniye TTL)
// ============================================
const cache = new Map();
const CACHE_TTL = 60000; // 60 saniye

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl
  });
}

function clearCache(prefix = null) {
  if (prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// ============================================
// DISPOSABLE EMAIL DOMAINS LIST
// ============================================
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com', '10minmail.com', 'tempmail.com', 'temp-mail.org',
  'guerrillamail.com', 'guerrillamail.org', 'throwaway.email', 'mailinator.com',
  'yopmail.com', 'sharklasers.com', 'spam4.me', 'trashmail.com',
  'fakeinbox.com', 'getnada.com', 'dispostable.com', 'maildrop.cc',
  'mohmal.com', 'tempail.com', 'emailondeck.com', 'mintemail.com',
  'tempr.email', 'discard.email', 'mailnesia.com', 'mt2009.com',
  'mytemp.email', 'tmpmail.org', 'tmpmail.net', 'tempinbox.com',
  'burnermail.io', 'throwawaymail.com', 'mailcatch.com', 'temp-mail.io',
  'fakemailgenerator.com', 'emailfake.com', 'generator.email', 'inboxkitten.com'
];

// ============================================
// DEFAULT RISK SETTINGS
// ============================================
const DEFAULT_RISK_SETTINGS = {
  isEnabled: true,
  isTestMode: false,
  thresholds: {
    cleanMax: 29,
    suspiciousMax: 59,
    riskyMin: 60
  },
  weights: {
    // Phone rules
    phoneEmpty: 40,
    phoneTRNotStartsWith5: 30,
    phoneInvalidLength: 20,
    phoneMultipleAccounts: 50,
    // Email rules
    disposableEmail: 40,
    emailNotVerified: 20,
    // Account & Behavior
    accountAgeLess10Min: 30,
    accountAgeLess1Hour: 20,
    firstOrder: 10,
    fastCheckout: 20,
    // IP & Device
    emptyUserAgent: 20,
    multipleAccountsSameIP: 30,
    multipleOrdersSameIP1Hour: 40,
    // Amount based
    amountOver300: 10,
    amountOver750: 20,
    amountOver1500: 35,
    firstOrderHighAmount: 25,
    // Blacklist
    blacklistHit: 100
  },
  hardBlocks: {
    invalidPhone: true,
    blacklistHit: true
  },
  suspiciousAutoApprove: false, // If false, suspicious orders need manual approval
  updatedAt: new Date(),
  updatedBy: 'system'
};

// ============================================
// RATE LIMITING CONFIG
// ============================================
const RATE_LIMITS = {
  '/api/auth/login': { limit: 5, windowMs: 60000, keyType: 'ip' },
  '/api/auth/register': { limit: 3, windowMs: 60000, keyType: 'ip' },
  '/api/orders': { limit: 10, windowMs: 60000, keyType: 'ip+user' },
  '/api/player/resolve': { limit: 30, windowMs: 60000, keyType: 'ip' },
  '/api/support': { limit: 10, windowMs: 60000, keyType: 'user' },
  '/api/admin': { limit: 60, windowMs: 60000, keyType: 'user' },
};

// Brute force config
const BRUTE_FORCE_CONFIG = {
  user: { maxAttempts: 5, lockoutMs: 10 * 60 * 1000 }, // 5 fails -> 10 min lockout
  admin: { maxAttempts: 3, lockoutMs: 30 * 60 * 1000 }, // 3 fails -> 30 min lockout
};

// In-memory rate limit store (will be moved to Redis in production)
const rateLimitStore = new Map();
const bruteForceStore = new Map();

// ============================================
// RATE LIMITING FUNCTIONS
// ============================================
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function getRateLimitKey(pathname, request, user = null) {
  const ip = getClientIP(request);
  
  // Find matching rate limit config
  let config = null;
  for (const [path, cfg] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      config = cfg;
      break;
    }
  }
  
  if (!config) return null;
  
  let key = pathname;
  if (config.keyType === 'ip') {
    key = `${pathname}:ip:${ip}`;
  } else if (config.keyType === 'user' && user) {
    key = `${pathname}:user:${user.id}`;
  } else if (config.keyType === 'ip+user') {
    key = user ? `${pathname}:user:${user.id}` : `${pathname}:ip:${ip}`;
  } else {
    key = `${pathname}:ip:${ip}`;
  }
  
  return { key, config };
}

function checkRateLimit(pathname, request, user = null) {
  const result = getRateLimitKey(pathname, request, user);
  if (!result) return { allowed: true };
  
  const { key, config } = result;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now - entry.windowStart >= config.windowMs) {
    // Start new window
    entry = { count: 1, windowStart: now };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: config.limit - 1 };
  }
  
  entry.count++;
  
  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.windowStart + config.windowMs - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }
  
  return { allowed: true, remaining: config.limit - entry.count };
}

// ============================================
// BRUTE FORCE PROTECTION
// ============================================
function getBruteForceKey(email, ip, isAdmin = false) {
  return `${isAdmin ? 'admin' : 'user'}:${email}:${ip}`;
}

function checkBruteForce(email, ip, isAdmin = false) {
  const key = getBruteForceKey(email, ip, isAdmin);
  const config = isAdmin ? BRUTE_FORCE_CONFIG.admin : BRUTE_FORCE_CONFIG.user;
  const entry = bruteForceStore.get(key);
  
  if (!entry) return { allowed: true };
  
  const now = Date.now();
  
  // Check if lockout expired
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, locked: true, retryAfter };
  }
  
  // Reset if lockout expired
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    bruteForceStore.delete(key);
    return { allowed: true };
  }
  
  return { allowed: true };
}

function recordFailedLogin(email, ip, isAdmin = false) {
  const key = getBruteForceKey(email, ip, isAdmin);
  const config = isAdmin ? BRUTE_FORCE_CONFIG.admin : BRUTE_FORCE_CONFIG.user;
  const now = Date.now();
  
  let entry = bruteForceStore.get(key) || { attempts: 0, firstAttempt: now };
  
  // Reset if window expired (2x lockout time)
  if (now - entry.firstAttempt > config.lockoutMs * 2) {
    entry = { attempts: 0, firstAttempt: now };
  }
  
  entry.attempts++;
  
  if (entry.attempts >= config.maxAttempts) {
    entry.lockedUntil = now + config.lockoutMs;
  }
  
  bruteForceStore.set(key, entry);
  return entry;
}

function clearBruteForce(email, ip, isAdmin = false) {
  const key = getBruteForceKey(email, ip, isAdmin);
  bruteForceStore.delete(key);
}

// ============================================
// HELPER - GET NEXT MIDNIGHT (for spin wheel)
// ============================================
function getNextMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

// ============================================
// DIJIPIN API FUNCTIONS
// ============================================

// DijiPin ürün ID eşleştirme (Pinly ürün title -> DijiPin customerStoreProductID)
// TOP-UP ürünleri - Direkt UC Yükleme
// Products/Detail endpoint'inden alınan customerStoreProductID değerleri
const DIJIPIN_PRODUCT_MAP = {
  '60 UC': 234,    // Top-Up PubG Mobile 60 UC - TR (productID: 265)
  '60 uc': 234,
  '60UC': 234,
  '60uc': 234,
  '325 UC': 235,   // Top-Up PubG Mobile 325 UC - TR (productID: 266)
  '325 uc': 235,
  '325UC': 235,
  '325uc': 235
};

// DijiPin desteklenen ürünleri kontrol et (sadece 60 UC ve 325 UC)
function isDijipinEligibleProduct(productTitle) {
  if (!productTitle) return false;
  const title = productTitle.toLowerCase().trim();
  // Sadece 60 UC veya 325 UC içeren ürünler
  return (title.includes('60') && title.includes('uc')) || 
         (title.includes('325') && title.includes('uc'));
}

// DijiPin ürün ID'sini bul (TOP-UP customerStoreProductID)
function getDijipinProductId(productTitle) {
  if (!productTitle) return null;
  const title = productTitle.toLowerCase().trim();
  
  if (title.includes('60') && title.includes('uc')) {
    return 234; // Top-Up PubG Mobile 60 UC - TR
  }
  if (title.includes('325') && title.includes('uc')) {
    return 235; // Top-Up PubG Mobile 325 UC - TR
  }
  return null;
}

// DijiPin bakiye sorgulama
async function getDijipinBalance() {
  if (!DIJIPIN_API_TOKEN) {
    console.log('DijiPin API token not configured');
    return null;
  }
  
  try {
    const response = await fetch(`${DIJIPIN_API_URL}/Customer/Get`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DIJIPIN_API_TOKEN}`,
        'Apikey': DIJIPIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('DijiPin balance response:', JSON.stringify(data));
    
    if (data.success) {
      // Tüm bakiye bilgilerini döndür
      return {
        balance: data.data.balance,
        currencyCode: data.data.currencyCode || 'TL',
        customerName: `${data.data.firstName} ${data.data.lastName}`,
        email: data.data.email
      };
    }
    console.log('DijiPin balance failed:', data.message);
    return null;
  } catch (error) {
    console.error('DijiPin balance check error:', error);
    return null;
  }
}

// DijiPin sipariş oluşturma (TOP-UP - Direkt UC Yükleme)
async function createDijipinOrder(productTitle, quantity, pubgId) {
  if (!DIJIPIN_API_TOKEN) {
    console.log('DijiPin API token not configured');
    return { success: false, error: 'DijiPin API yapılandırılmamış' };
  }
  
  if (!pubgId) {
    console.log('PUBG ID is required for DijiPin order');
    return { success: false, error: 'PUBG ID gerekli' };
  }
  
  // Ürün ID'sini bul (customerStoreProductID)
  const dijipinProductId = getDijipinProductId(productTitle);
  
  if (!dijipinProductId) {
    console.log('DijiPin product not found for:', productTitle);
    return { success: false, error: 'Bu ürün DijiPin entegrasyonunda bulunamadı (sadece 60 UC ve 325 UC desteklenir)' };
  }
  
  console.log(`DijiPin order: Product "${productTitle}" -> DijiPin customerStoreProductID: ${dijipinProductId}, PUBG ID: ${pubgId}`);
  
  try {
    const response = await fetch(`${DIJIPIN_API_URL}/Order/Create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIJIPIN_API_TOKEN}`,
        'Apikey': DIJIPIN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        basketData: [
          {
            customerStoreProductID: dijipinProductId,
            quantity: quantity || 1,
            requireData: [
              {
                productRequireID: 1,
                identifier: "user_id",
                title: "Oyuncu ID",
                value: pubgId.toString()
              }
            ]
          }
        ]
      })
    });
    
    const data = await response.json();
    console.log('DijiPin order response:', JSON.stringify(data));
    
    if (data.success) {
      return {
        success: true,
        orderId: data.data.orderID,
        details: data.data.details,
        message: data.message
      };
    } else {
      return {
        success: false,
        error: data.message || 'DijiPin sipariş hatası',
        errorCode: data.errorCode
      };
    }
  } catch (error) {
    console.error('DijiPin order create error:', error);
    return { success: false, error: 'DijiPin bağlantı hatası: ' + error.message };
  }
}

// DijiPin sipariş durumu sorgulama
async function getDijipinOrderStatus(orderId) {
  if (!DIJIPIN_API_TOKEN) {
    return null;
  }
  
  try {
    const response = await fetch(`${DIJIPIN_API_URL}/Order/Get?orderID=${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DIJIPIN_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('DijiPin order status error:', error);
    return null;
  }
}

// ============================================
// AUDIT LOG FUNCTIONS
// ============================================
async function logAuditAction(db, action, actorId, entityType, entityId, request, meta = {}) {
  try {
    const auditLog = {
      id: uuidv4(),
      action,
      actorId,
      entityType,
      entityId,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      meta,
      createdAt: new Date()
    };
    
    await db.collection('audit_logs').insertOne(auditLog);
    return auditLog;
  } catch (error) {
    console.error('Failed to log audit action:', error);
    return null;
  }
}

// Audit action types
const AUDIT_ACTIONS = {
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  STOCK_ADD: 'stock.add',
  STOCK_ASSIGN: 'stock.assign',
  STOCK_RESET: 'stock.reset',
  ORDER_STATUS_CHANGE: 'order.status_change',
  SITE_SETTINGS_UPDATE: 'settings.site_update',
  OAUTH_SETTINGS_UPDATE: 'settings.oauth_update',
  PAYMENT_SETTINGS_UPDATE: 'settings.payment_update',
  EMAIL_SETTINGS_UPDATE: 'settings.email_update',
  USER_CREATE: 'user.create',
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  ADMIN_LOGIN: 'admin.login',
  ADMIN_LOGIN_FAILED: 'admin.login_failed',
  TICKET_CREATE: 'ticket.create',
  TICKET_REPLY: 'ticket.reply',
  TICKET_CLOSE: 'ticket.close',
  ORDER_RISK_FLAG: 'order.risk_flag',
  ORDER_MANUAL_APPROVE: 'order.manual_approve',
  ORDER_MANUAL_REFUND: 'order.manual_refund',
  ORDER_VERIFICATION_SUBMIT: 'order.verification_submit',
  ORDER_VERIFICATION_APPROVE: 'order.verification_approve',
  ORDER_VERIFICATION_REJECT: 'order.verification_reject',
};

// ============================================
// RISK SCORING SYSTEM (Dynamic from DB)
// ============================================

async function calculateOrderRisk(db, order, user, request) {
  // Get risk settings from database or use defaults
  let riskSettings = await db.collection('risk_settings').findOne({ id: 'main' });
  if (!riskSettings) {
    riskSettings = { ...DEFAULT_RISK_SETTINGS, id: 'main' };
  }

  // If risk system is disabled, return clean status
  if (!riskSettings.isEnabled) {
    return {
      score: 0,
      status: 'CLEAR',
      reasons: [],
      calculatedAt: new Date(),
      settingsSnapshot: { isEnabled: false }
    };
  }

  let score = 0;
  const reasons = [];
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const weights = riskSettings.weights || DEFAULT_RISK_SETTINGS.weights;
  const thresholds = riskSettings.thresholds || DEFAULT_RISK_SETTINGS.thresholds;

  // ============================================
  // BLACKLIST CHECKS (Priority)
  // ============================================
  const blacklistChecks = await checkBlacklist(db, {
    email: user.email,
    phone: user.phone,
    ip: ip,
    playerId: order.playerId,
    emailDomain: user.email?.split('@')[1]
  });

  if (blacklistChecks.hit) {
    if (riskSettings.hardBlocks?.blacklistHit) {
      return {
        score: 100,
        status: 'BLOCKED',
        reasons: blacklistChecks.reasons,
        calculatedAt: new Date(),
        hardBlock: true,
        hardBlockReason: 'blacklist'
      };
    } else {
      score += weights.blacklistHit || 100;
      reasons.push(...blacklistChecks.reasons);
    }
  }

  // ============================================
  // PHONE RULES
  // ============================================
  const phone = user.phone?.replace(/[\s\-\(\)\+]/g, '') || '';
  
  // Phone empty
  if (!phone || phone.length === 0) {
    score += weights.phoneEmpty || 40;
    reasons.push({ code: 'PHONE_EMPTY', label: 'Telefon numarası boş', points: weights.phoneEmpty || 40 });
  } else {
    // TR phone check - Site varsayılan olarak TR için çalışıyor
    // TR numaraları 5 ile başlamalı (05xx veya 5xx formatında)
    const cleanPhone = phone.replace(/^(90|0)/, ''); // Remove country code and leading 0
    
    // Check if phone starts with 5 (Turkish mobile numbers)
    if (!cleanPhone.startsWith('5')) {
      score += weights.phoneTRNotStartsWith5 || 30;
      reasons.push({ code: 'PHONE_TR_FORMAT', label: 'TR telefon numarası 5 ile başlamalı', points: weights.phoneTRNotStartsWith5 || 30 });
    }
    
    // Phone length check (should be 10 digits for TR after removing country code)
    if (cleanPhone.length !== 10) {
      score += weights.phoneInvalidLength || 20;
      reasons.push({ code: 'PHONE_LENGTH', label: `Telefon uzunluğu geçersiz (${cleanPhone.length} hane)`, points: weights.phoneInvalidLength || 20 });
    }
  }

  // Same phone with 2+ accounts
  if (phone && phone.length >= 10) {
    const accountsWithPhone = await db.collection('users').countDocuments({ 
      phone: { $regex: phone.slice(-10) },
      id: { $ne: user.id }
    });
    if (accountsWithPhone >= 1) {
      score += weights.phoneMultipleAccounts || 50;
      reasons.push({ code: 'PHONE_MULTI_ACCOUNT', label: `Aynı telefonla ${accountsWithPhone + 1} hesap`, points: weights.phoneMultipleAccounts || 50 });
    }
  }

  // ============================================
  // EMAIL RULES
  // ============================================
  const emailDomain = user.email?.split('@')[1]?.toLowerCase() || '';
  
  // Check disposable email
  const allDisposableDomains = await getDisposableDomains(db);
  if (allDisposableDomains.includes(emailDomain)) {
    score += weights.disposableEmail || 40;
    reasons.push({ code: 'DISPOSABLE_EMAIL', label: 'Geçici e-posta adresi', points: weights.disposableEmail || 40 });
  }

  // Email not verified (if system supports verification)
  if (user.emailVerified === false && weights.emailNotVerified > 0) {
    score += weights.emailNotVerified || 20;
    reasons.push({ code: 'EMAIL_NOT_VERIFIED', label: 'E-posta doğrulanmamış', points: weights.emailNotVerified || 20 });
  }

  // ============================================
  // ACCOUNT & BEHAVIOR RULES
  // ============================================
  const accountAgeMs = new Date() - new Date(user.createdAt);
  const accountAgeMinutes = accountAgeMs / (1000 * 60);
  const accountAgeHours = accountAgeMs / (1000 * 60 * 60);

  // Account age < 10 minutes
  if (accountAgeMinutes < 10) {
    score += weights.accountAgeLess10Min || 30;
    reasons.push({ code: 'ACCOUNT_VERY_NEW', label: 'Hesap yaşı 10 dakikadan az', points: weights.accountAgeLess10Min || 30 });
  } else if (accountAgeHours < 1) {
    // Account age < 1 hour
    score += weights.accountAgeLess1Hour || 20;
    reasons.push({ code: 'ACCOUNT_NEW', label: 'Hesap yaşı 1 saatten az', points: weights.accountAgeLess1Hour || 20 });
  }

  // First order check
  const previousOrders = await db.collection('orders').countDocuments({ 
    userId: user.id, 
    status: { $in: ['paid', 'completed'] } 
  });
  const isFirstOrder = previousOrders === 0;
  if (isFirstOrder) {
    score += weights.firstOrder || 10;
    reasons.push({ code: 'FIRST_ORDER', label: 'İlk sipariş', points: weights.firstOrder || 10 });
  }

  // Fast checkout (login to checkout < 30 seconds)
  if (user.lastLoginAt) {
    const timeSinceLogin = new Date() - new Date(user.lastLoginAt);
    if (timeSinceLogin < 30000) { // 30 seconds
      score += weights.fastCheckout || 20;
      reasons.push({ code: 'FAST_CHECKOUT', label: 'Çok hızlı checkout (30 sn altı)', points: weights.fastCheckout || 20 });
    }
  }

  // ============================================
  // IP & DEVICE RULES
  // ============================================
  
  // Empty or very short user agent
  if (!userAgent || userAgent.length < 20) {
    score += weights.emptyUserAgent || 20;
    reasons.push({ code: 'SUSPICIOUS_UA', label: 'Şüpheli user-agent', points: weights.emptyUserAgent || 20 });
  }

  // Multiple accounts from same IP
  if (ip && ip !== 'unknown') {
    const accountsFromIP = await db.collection('users').countDocuments({
      'meta.lastIP': ip,
      id: { $ne: user.id }
    });
    if (accountsFromIP >= 2) {
      score += weights.multipleAccountsSameIP || 30;
      reasons.push({ code: 'IP_MULTI_ACCOUNT', label: `Aynı IP'den ${accountsFromIP + 1} hesap`, points: weights.multipleAccountsSameIP || 30 });
    }

    // Multiple orders from same IP in last hour
    const ordersFromIP = await db.collection('orders').countDocuments({
      'meta.ip': ip,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      id: { $ne: order.id }
    });
    if (ordersFromIP >= 3) {
      score += weights.multipleOrdersSameIP1Hour || 40;
      reasons.push({ code: 'IP_MULTI_ORDER', label: `Aynı IP'den ${ordersFromIP + 1} sipariş (1 saat)`, points: weights.multipleOrdersSameIP1Hour || 40 });
    }
  }

  // ============================================
  // AMOUNT BASED RULES
  // ============================================
  const amount = order.amount || 0;

  if (amount >= 1500) {
    score += weights.amountOver1500 || 35;
    reasons.push({ code: 'HIGH_AMOUNT_1500', label: `Yüksek tutar: ₺${amount}`, points: weights.amountOver1500 || 35 });
  } else if (amount >= 750) {
    score += weights.amountOver750 || 20;
    reasons.push({ code: 'HIGH_AMOUNT_750', label: `Yüksek tutar: ₺${amount}`, points: weights.amountOver750 || 20 });
  } else if (amount >= 300) {
    score += weights.amountOver300 || 10;
    reasons.push({ code: 'MEDIUM_AMOUNT', label: `Orta tutar: ₺${amount}`, points: weights.amountOver300 || 10 });
  }

  // First order + high amount (750+)
  if (isFirstOrder && amount >= 750) {
    score += weights.firstOrderHighAmount || 25;
    reasons.push({ code: 'FIRST_ORDER_HIGH', label: 'İlk siparişte yüksek tutar', points: weights.firstOrderHighAmount || 25 });
  }

  // ============================================
  // DETERMINE STATUS
  // ============================================
  const finalScore = Math.min(score, 100);
  let status;
  
  if (finalScore <= thresholds.cleanMax) {
    status = 'CLEAR';
  } else if (finalScore <= thresholds.suspiciousMax) {
    status = 'SUSPICIOUS';
  } else {
    status = 'FLAGGED';
  }

  // Log risk calculation
  await db.collection('risk_logs').insertOne({
    id: uuidv4(),
    orderId: order.id,
    userId: user.id,
    score: finalScore,
    status,
    reasons,
    ip,
    userAgent: userAgent.substring(0, 500), // Truncate for storage
    isTestMode: riskSettings.isTestMode,
    createdAt: new Date()
  });

  return {
    score: finalScore,
    status: riskSettings.isTestMode ? 'CLEAR' : status, // In test mode, always return CLEAR for delivery
    actualStatus: status, // Real status for display
    reasons,
    calculatedAt: new Date(),
    isTestMode: riskSettings.isTestMode
  };
}

// Check blacklist helper
async function checkBlacklist(db, data) {
  const hits = [];
  
  // Check email
  if (data.email) {
    const emailBlacklist = await db.collection('blacklist').findOne({
      type: 'email',
      value: data.email.toLowerCase(),
      isActive: true
    });
    if (emailBlacklist) {
      hits.push({ code: 'BLACKLIST_EMAIL', label: `Kara listede e-posta: ${data.email}`, points: 100 });
    }
  }

  // Check email domain
  if (data.emailDomain) {
    const domainBlacklist = await db.collection('blacklist').findOne({
      type: 'domain',
      value: data.emailDomain.toLowerCase(),
      isActive: true
    });
    if (domainBlacklist) {
      hits.push({ code: 'BLACKLIST_DOMAIN', label: `Kara listede domain: ${data.emailDomain}`, points: 100 });
    }
  }

  // Check phone
  if (data.phone) {
    const cleanPhone = data.phone.replace(/[\s\-\(\)\+]/g, '');
    const phoneBlacklist = await db.collection('blacklist').findOne({
      type: 'phone',
      value: { $regex: cleanPhone.slice(-10) },
      isActive: true
    });
    if (phoneBlacklist) {
      hits.push({ code: 'BLACKLIST_PHONE', label: `Kara listede telefon`, points: 100 });
    }
  }

  // Check IP
  if (data.ip && data.ip !== 'unknown') {
    const ipBlacklist = await db.collection('blacklist').findOne({
      type: 'ip',
      value: data.ip,
      isActive: true
    });
    if (ipBlacklist) {
      hits.push({ code: 'BLACKLIST_IP', label: `Kara listede IP: ${data.ip}`, points: 100 });
    }
  }

  // Check Player ID
  if (data.playerId) {
    const playerBlacklist = await db.collection('blacklist').findOne({
      type: 'playerId',
      value: data.playerId,
      isActive: true
    });
    if (playerBlacklist) {
      hits.push({ code: 'BLACKLIST_PLAYER', label: `Kara listede oyuncu ID: ${data.playerId}`, points: 100 });
    }
  }

  return {
    hit: hits.length > 0,
    reasons: hits
  };
}

// Get disposable domains (built-in + custom from DB)
async function getDisposableDomains(db) {
  const customDomains = await db.collection('blacklist').find({
    type: 'domain',
    isActive: true
  }).toArray();
  
  const customList = customDomains.map(d => d.value.toLowerCase());
  return [...new Set([...DISPOSABLE_EMAIL_DOMAINS, ...customList])];
}

// ============================================
// INPUT VALIDATION HELPERS
// ============================================
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // Remove MongoDB operators
  return str.replace(/\$|\./g, '');
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  
  return sanitized;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// ============================================
// SHOPIER EMAIL MASKING - Gerçek e-posta yerine sahte e-posta gönder
// ============================================
function maskEmailForShopier(email) {
  if (!email || typeof email !== 'string') return email;
  
  // E-postayı @ işaretinden böl
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  
  const localPart = parts[0];
  const domain = parts[1];
  
  // 1-2 rastgele karakter oluştur (harf + sayı karışık)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomLength = Math.random() > 0.5 ? 2 : 1; // %50 ihtimalle 1 veya 2 karakter
  let randomSuffix = '';
  for (let i = 0; i < randomLength; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Yeni e-posta: localpart + rastgele karakterler + @domain
  return `${localPart}${randomSuffix}@${domain}`;
}

// ============================================
// NETGSM SMS SERVICE
// ============================================

async function getSmsSettings(db) {
  const settings = await db.collection('sms_settings').findOne({ id: 'main' });
  console.log('SMS Settings raw:', settings ? { enabled: settings.enabled, usercode: settings.usercode, hasPassword: !!settings.password } : 'null');
  
  if (!settings || !settings.enabled) {
    console.log('SMS settings disabled or not found');
    return null;
  }
  
  // Decrypt password
  if (settings.password) {
    try {
      settings.password = decrypt(settings.password);
      console.log('SMS password decrypted successfully');
    } catch (error) {
      console.error('Failed to decrypt SMS password, trying as plain text');
      // Şifre düz metin olabilir, decrypt etmeden kullan
    }
  }
  
  return settings;
}

// Telefon numarasını NetGSM formatına çevir (905xxxxxxxxx)
function formatPhoneForNetgsm(phone) {
  if (!phone) return null;
  
  // Tüm boşluk, tire, parantez temizle
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Başındaki 0'ı kaldır ve 90 ekle
  if (cleaned.startsWith('0')) {
    cleaned = '90' + cleaned.substring(1);
  }
  // Eğer 5 ile başlıyorsa 90 ekle
  else if (cleaned.startsWith('5')) {
    cleaned = '90' + cleaned;
  }
  // Eğer 90 ile başlamıyorsa 90 ekle
  else if (!cleaned.startsWith('90')) {
    cleaned = '90' + cleaned;
  }
  
  return cleaned;
}

// NetGSM SMS Gönder - YENİ API v2
async function sendSms(db, phone, message, type = 'general', orderId = null) {
  const settings = await getSmsSettings(db);
  
  if (!settings) {
    console.log('SMS disabled or not configured');
    return { success: false, reason: 'disabled' };
  }
  
  const formattedPhone = formatPhoneForNetgsm(phone);
  if (!formattedPhone || formattedPhone.length < 12) {
    console.log('Invalid phone number for SMS:', phone);
    return { success: false, reason: 'invalid_phone' };
  }
  
  try {
    // NetGSM API URL - YENİ v2 endpoint
    const apiUrl = 'https://api.netgsm.com.tr/sms/rest/v2/send';
    
    // Basic Auth credentials (Base64 encoded)
    const credentials = Buffer.from(`${settings.usercode}:${settings.password}`).toString('base64');
    
    // JSON payload
    const payload = {
      msgheader: settings.msgheader || 'PINLY',
      messages: [
        {
          msg: message,
          no: formattedPhone
        }
      ],
      encoding: 'TR', // Türkçe karakter desteği
      iysfilter: '0' // Bilgilendirme SMS'i (İYS kontrolsüz)
    };
    
    console.log(`Sending SMS to ${formattedPhone}: ${message.substring(0, 50)}...`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('NetGSM response:', JSON.stringify(result));
    
    // Başarılı yanıt kontrolü
    const isSuccess = result.code === '00' || result.code === '01' || result.code === '02';
    
    // SMS log kaydet
    await db.collection('sms_logs').insertOne({
      id: uuidv4(),
      phone: formattedPhone,
      message: message,
      type: type,
      orderId: orderId,
      status: isSuccess ? 'sent' : 'failed',
      response: JSON.stringify(result),
      jobId: result.jobid || null,
      createdAt: new Date()
    });
    
    if (isSuccess) {
      console.log(`SMS sent successfully to ${formattedPhone}, jobId: ${result.jobid}`);
      return { success: true, response: result, jobId: result.jobid };
    } else {
      console.error(`SMS failed: ${result.code} - ${result.description || 'Unknown error'}`);
      return { success: false, reason: 'api_error', response: result };
    }
    
  } catch (error) {
    console.error('SMS send error:', error);
    
    // Hata log kaydet
    await db.collection('sms_logs').insertOne({
      id: uuidv4(),
      phone: formattedPhone,
      message: message,
      type: type,
      orderId: orderId,
      status: 'error',
      error: error.message,
      createdAt: new Date()
    });
    
    return { success: false, reason: 'error', error: error.message };
  }
}

// Ödeme Başarılı SMS
async function sendPaymentSuccessSms(db, order, user, productTitle) {
  // Ayarları kontrol et
  const settings = await getSmsSettings(db);
  if (!settings || !settings.sendOnPayment) {
    console.log('Payment SMS disabled');
    return { success: false, reason: 'disabled' };
  }
  
  const customerName = user.firstName || user.name || 'Müşteri';
  const message = `${customerName} Merhaba siparisin onaylandi lutfen siparislerim kismindaki kodunu aktif et. Sorulariniz icin sitemizden canli destek kismina yazabilirsiniz. Calisma saatleri: 14:00-22:00 her gun - PINLY`;
  return sendSms(db, user.phone, message, 'payment_success', order.id);
}

// Teslimat SMS - Devre dışı (sadece ödeme SMS'i aktif)
async function sendDeliverySms(db, order, user, productTitle) {
  // Teslimat SMS'i devre dışı - sadece ödeme SMS'i gönderilecek
  console.log('Delivery SMS disabled - only payment SMS active');
  return { success: false, reason: 'disabled' };
}

// Hesap Teslimat SMS - Devre dışı (sadece ödeme SMS'i aktif)
async function sendAccountDeliverySms(db, order, user, accountTitle) {
  // Teslimat SMS'i devre dışı - sadece ödeme SMS'i gönderilecek
  console.log('Account delivery SMS disabled - only payment SMS active');
  return { success: false, reason: 'disabled' };
}

// Terk Edilmiş Sipariş SMS - Ödeme yapmayanlar için hatırlatma
async function sendAbandonedOrderSms(db, order, user) {
  // Ayarları kontrol et
  const settings = await getSmsSettings(db);
  if (!settings || !settings.enabled) {
    console.log('Abandoned order SMS disabled');
    return { success: false, reason: 'disabled' };
  }
  
  const customerName = user.firstName || user.name || 'Müşteri';
  const message = `${customerName} Merhaba, siparisini tamamlamayi unuttun mu? Hemen odeme yap pinly.com.tr - PINLY`;
  return sendSms(db, user.phone, message, 'abandoned_order', order.id);
}

// ============================================
// EMAIL SERVICE
// ============================================

async function getEmailSettings(db) {
  const settings = await db.collection('email_settings').findOne({ id: 'main' });
  if (!settings) return null;
  
  // Decrypt SMTP password
  if (settings.smtpPass) {
    try {
      settings.smtpPass = decrypt(settings.smtpPass);
    } catch (error) {
      console.error('Failed to decrypt SMTP password');
      return null;
    }
  }
  
  return settings;
}

async function createTransporter(settings) {
  if (!settings || !settings.enableEmail) return null;
  
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: parseInt(settings.smtpPort) || 587,
    secure: settings.smtpSecure === true || settings.smtpPort === '465',
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    },
    // Anti-spam headers
    dkim: settings.dkim || undefined
  });
}

// Generate plain text version from HTML (for multipart emails)
function htmlToPlainText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Email log to prevent duplicates
async function checkEmailSent(db, type, userId, orderId = null, ticketId = null) {
  const query = { type, userId };
  if (orderId) query.orderId = orderId;
  if (ticketId) query.ticketId = ticketId;
  
  const existing = await db.collection('email_logs').findOne(query);
  return !!existing;
}

async function logEmail(db, type, userId, to, status, orderId = null, ticketId = null, error = null) {
  await db.collection('email_logs').insertOne({
    id: uuidv4(),
    type,
    userId,
    orderId,
    ticketId,
    to,
    status,
    error: error ? error.message : null,
    createdAt: new Date()
  });
}

// Premium HTML Email Template Generator - Spam-Free Version
function generateEmailTemplate(content, settings = {}) {
  const siteName = settings.siteName || 'PINLY';
  
  // Çok basit ve temiz HTML - spam filtrelerinden kaçınmak için
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${siteName}</title>
</head>
<body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#333;margin:0;padding:20px;background:#fff;">

<p style="font-size:18px;font-weight:bold;color:#1e40af;margin:0 0 20px 0;">${siteName}</p>

<p style="font-size:16px;font-weight:bold;margin:0 0 15px 0;">${content.title}</p>

${content.body.replace(/<p>/g, '<p style="margin:0 0 10px 0;">').replace(/<ul>/g, '<ul style="margin:10px 0;padding-left:20px;">').replace(/<li>/g, '<li style="margin:5px 0;">')}

${content.cta ? `
<p style="margin:20px 0;">
<a href="${content.cta.url}" style="color:#1e40af;text-decoration:underline;">${content.cta.text}</a>
</p>
` : ''}

${content.codes ? `
<p style="margin:20px 0 10px 0;font-weight:bold;">Kodlariniz:</p>
${content.codes.map(code => `<p style="margin:5px 0;padding:10px;background:#f5f5f5;font-family:monospace;border:1px solid #ddd;">${code}</p>`).join('')}
<p style="margin:10px 0;color:#c00;font-size:12px;">Bu kodlari kimseyle paylasmayin.</p>
` : ''}

${content.info ? `<p style="margin:15px 0;padding:10px;background:#e7f3ff;border-left:3px solid #1e40af;">${content.info}</p>` : ''}

${content.warning ? `<p style="margin:15px 0;padding:10px;background:#fff3cd;border-left:3px solid #ffc107;">${content.warning}</p>` : ''}

<hr style="border:none;border-top:1px solid #eee;margin:30px 0 15px 0;">

<p style="font-size:12px;color:#999;margin:0;">${siteName}</p>

</body>
</html>`;
}

// Email Sending Functions
async function sendEmail(db, type, to, content, userId, orderId = null, ticketId = null, skipDuplicateCheck = false) {
  const settings = await getEmailSettings(db);
  
  if (!settings || !settings.enableEmail) {
    console.log('Email disabled or not configured');
    return { success: false, reason: 'disabled' };
  }
  
  // Check for duplicates (unless skipped)
  if (!skipDuplicateCheck) {
    const alreadySent = await checkEmailSent(db, type, userId, orderId, ticketId);
    if (alreadySent) {
      console.log(`Duplicate email prevented: ${type} for user ${userId}`);
      return { success: false, reason: 'duplicate' };
    }
  }
  
  try {
    const transporter = await createTransporter(settings);
    if (!transporter) {
      return { success: false, reason: 'transporter_failed' };
    }
    
    // Get site settings for template
    const siteSettings = await db.collection('site_settings').findOne({ id: 'main' });
    
    const html = generateEmailTemplate(content, {
      logoUrl: siteSettings?.logoUrl,
      siteName: siteSettings?.siteName || 'PINLY'
    });
    
    // Plain text version for multipart (helps avoid spam)
    const text = htmlToPlainText(html);
    
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      replyTo: settings.fromEmail,
      to,
      subject: content.subject,
      text: text, // Plain text version
      html: html, // HTML version
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'PINLY Mailer',
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'OOF, AutoReply'
      }
    });
    
    await logEmail(db, type, userId, to, 'sent', orderId, ticketId);
    console.log(`Email sent: ${type} to ${to}`);
    return { success: true };
    
  } catch (error) {
    console.error(`Email send failed: ${error.message}`);
    await logEmail(db, type, userId, to, 'failed', orderId, ticketId, error);
    return { success: false, reason: 'send_failed', error: error.message };
  }
}

// Specific Email Templates
async function sendWelcomeEmail(db, user) {
  const content = {
    subject: `Hos geldin ${user.firstName}`,
    title: `Merhaba ${user.firstName}`,
    body: `
      <p>PINLY ailesine hos geldin!</p>
      <p>Hesabin basariyla olusturuldu. Artik en uygun fiyatlarla UC satin alabilir ve aninda teslimat alabilirsin.</p>
    `,
    cta: {
      text: 'Alisverise Basla',
      url: BASE_URL
    }
  };
  
  return sendEmail(db, 'welcome', user.email, content, user.id);
}

async function sendOrderCreatedEmail(db, order, user, product) {
  const content = {
    subject: `Siparisiniz alindi - ${order.id.slice(-8)}`,
    title: 'Siparisiniz Alindi',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Siparisiniz basariyla olusturuldu. Odeme islemini tamamladiktan sonra teslimat yapilacaktir.</p>
      
      <p style="margin-top:20px;"><strong>Siparis Detaylari:</strong></p>
      <ul>
        <li>Siparis No: ${order.id.slice(-8)}</li>
        <li>Urun: ${product.title}</li>
        <li>Toplam: ${product.price.toFixed(2)} TL</li>
      </ul>
    `,
    cta: {
      text: 'Siparisi Goruntule',
      url: `${BASE_URL}/account/orders/${order.id}`
    }
  };
  
  return sendEmail(db, 'order_created', user.email, content, user.id, order.id);
}

async function sendPaymentSuccessEmail(db, order, user, product) {
  const content = {
    subject: `Odemeniz alindi - ${order.id.slice(-8)}`,
    title: 'Odeme Basarili',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Odemeniz basariyla alindi. Siparisiniz isleme alindi ve teslimat hazirlaniyor.</p>
      
      <p style="margin-top:20px;"><strong>Siparis Bilgileri:</strong></p>
      <ul>
        <li>Siparis No: ${order.id.slice(-8)}</li>
        <li>Urun: ${product.title}</li>
        <li>Odenen Tutar: ${product.price.toFixed(2)} TL</li>
      </ul>
    `,
    cta: {
      text: 'Siparis Durumunu Kontrol Et',
      url: `${BASE_URL}/account/orders/${order.id}`
    },
    info: 'Teslimat tamamlandiginda size tekrar bilgi verecegiz.'
  };
  
  return sendEmail(db, 'paid', user.email, content, user.id, order.id);
}

async function sendDeliveredEmail(db, order, user, product, codes) {
  const content = {
    subject: `Teslimat tamamlandi - ${order.id.slice(-8)}`,
    title: 'Teslimat Tamamlandi',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Siparisiniz basariyla teslim edildi.</p>
      
      <p style="margin-top:20px;"><strong>Siparis Bilgileri:</strong></p>
      <ul>
        <li>Urun: ${product.title}</li>
      </ul>
    `,
    codes: codes,
    cta: {
      text: 'Siparis Detaylarini Gor',
      url: `${BASE_URL}/account/orders/${order.id}`
    }
  };
  
  return sendEmail(db, 'delivered', user.email, content, user.id, order.id);
}

async function sendPendingStockEmail(db, order, user, product, message) {
  const content = {
    subject: `Stok bekleniyor - ${order.id.slice(-8)}`,
    title: 'Siparisiniz Beklemede',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Odemeniz alindi ancak su anda bu urun icin stok bulunmamaktadir.</p>
      <p><strong>Durum:</strong> ${message || 'Stok bekleniyor'}</p>
      
      <p style="margin-top:20px;"><strong>Siparis Bilgileri:</strong></p>
      <ul>
        <li>Siparis No: ${order.id.slice(-8)}</li>
        <li>Urun: ${product.title}</li>
      </ul>
    `,
    cta: {
      text: 'Siparis Durumunu Takip Et',
      url: `${BASE_URL}/account/orders/${order.id}`
    },
    info: 'Stok geldiginde siparisiniz otomatik olarak teslim edilecek ve size bilgi verilecektir.'
  };
  
  return sendEmail(db, 'pending', user.email, content, user.id, order.id);
}

async function sendSupportReplyEmail(db, ticket, user, adminMessage) {
  const preview = adminMessage.length > 200 ? adminMessage.substring(0, 200) + '...' : adminMessage;
  
  const content = {
    subject: `Destek talebinize yanit var - ${ticket.id.slice(-8)}`,
    title: 'Destek Ekibinden Yanit',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Destek talebinize yanit verildi.</p>
      
      <p style="margin-top:20px;"><strong>Talep:</strong> ${ticket.subject}</p>
      <p style="padding:15px;background:#f5f5f5;border-left:3px solid #1e40af;">
        "${preview}"
          </p>
      </p>
    `,
    cta: {
      text: 'Yaniti Goruntule',
      url: `${BASE_URL}/account/support/${ticket.id}`
    },
    info: 'Artik siz de yanit verebilirsiniz.'
  };
  
  // Support replies can be multiple, so skip duplicate check
  return sendEmail(db, 'support_reply', user.email, content, user.id, null, ticket.id, true);
}

async function sendPasswordChangedEmail(db, user) {
  const content = {
    subject: 'Sifreniz degistirildi',
    title: 'Sifre Degisikligi Bildirimi',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Hesabinizin sifresi basariyla degistirildi.</p>
      
      <p style="margin-top:20px;">
        Tarih: ${new Date().toLocaleString('tr-TR')}<br>
        Hesap: ${user.email}
      </p>
    `,
    warning: 'Bu islemi siz yapmadiysan, hemen destek ekibiyle iletisime gecin!',
    cta: {
      text: 'Destek Talebi Olustur',
      url: `${BASE_URL}/account/support/new`
    }
  };
  
  // Password change emails should always send (skip duplicate)
  return sendEmail(db, 'password_changed', user.email, content, user.id, null, null, true);
}

// Password Reset Email
async function sendPasswordResetEmail(db, user, resetToken) {
  const resetLink = `${BASE_URL}/reset-password?token=${resetToken}`;
  
  const content = {
    subject: 'Şifre Sıfırlama Talebi',
    title: 'Şifre Sıfırlama',
    body: `
      <p>Merhaba ${user.firstName || 'Değerli Müşterimiz'},</p>
      <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
      <p>Yeni şifrenizi oluşturmak için aşağıdaki butona tıklayın:</p>
    `,
    warning: 'Bu link 1 saat içinde geçerliliğini yitirecektir. Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.',
    cta: {
      text: 'Şifremi Sıfırla',
      url: resetLink
    }
  };
  
  return sendEmail(db, 'password_reset', user.email, content, user.id, null, null, true);
}

async function sendVerificationRejectedEmail(db, order, user, rejectionReason) {
  const content = {
    subject: `Doğrulama reddedildi - ${order.id.slice(-8)}`,
    title: 'Doğrulama Reddedildi',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Maalesef yüksek tutarlı siparişiniz için gönderdiğiniz doğrulama belgeleri uygun bulunmadı.</p>
      
      <p style="margin-top:20px;"><strong>Sipariş Bilgileri:</strong></p>
      <ul>
        <li>Sipariş No: ${order.id.slice(-8)}</li>
        <li>Tutar: ${order.amount.toFixed(2)} TL</li>
      </ul>
      
      <p style="margin-top:20px;"><strong>Red Sebebi:</strong></p>
      <p style="padding:15px;background:#fff3cd;border-left:3px solid #ffc107;">
        ${rejectionReason || 'Doğrulama belgeleri uygun değil'}
      </p>
    `,
    warning: 'Siparişiniz iptal edildi ve para iadesi işlemi başlatıldı. İade süreci 3-5 iş günü sürebilir.',
    cta: {
      text: 'Destek Talebi Oluştur',
      url: `${BASE_URL}/account/support/new`
    }
  };
  
  return sendEmail(db, 'verification_rejected', user.email, content, user.id, order.id);
}

async function sendVerificationRequiredEmail(db, order, user, product) {
  const content = {
    subject: `Doğrulama gerekli - ${order.id.slice(-8)}`,
    title: 'Yüksek Tutarlı Sipariş - Doğrulama Gerekli',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Yüksek tutarlı siparişiniz için güvenlik doğrulaması gereklidir.</p>
      
      <p style="margin-top:20px;"><strong>Sipariş Bilgileri:</strong></p>
      <ul>
        <li>Sipariş No: ${order.id.slice(-8)}</li>
        <li>Ürün: ${product.title}</li>
        <li>Tutar: ${order.amount.toFixed(2)} TL</li>
      </ul>
      
      <p style="margin-top:20px;"><strong>Gerekli Belgeler:</strong></p>
      <ul>
        <li>Kimlik fotoğrafı (TC kimlik kartı ön yüz)</li>
        <li>Ödeme dekontu/ekran görüntüsü</li>
      </ul>
    `,
    info: 'Doğrulama belgeleri onaylandıktan sonra siparişiniz teslim edilecektir.',
    cta: {
      text: 'Doğrulama Belgelerini Yükle',
      url: `${BASE_URL}/account/orders/${order.id}`
    }
  };
  
  return sendEmail(db, 'verification_required', user.email, content, user.id, order.id);
}

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb && cachedClient) {
    return cachedDb;
  }
  
  if (!cachedClient) {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    };
    
    cachedClient = await MongoClient.connect(MONGO_URL, options);
    
    // Handle connection errors
    cachedClient.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cachedClient = null;
      cachedDb = null;
    });
    
    cachedClient.on('close', () => {
      console.log('MongoDB connection closed');
      cachedClient = null;
      cachedDb = null;
    });
  }
  
  cachedDb = cachedClient.db(DB_NAME);
  return cachedDb;
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
  
  // Check if user has admin role
  if (user.role !== 'admin') {
    return null; // Reject non-admin users
  }
  
  return user;
}

// Helper function to return 403 for non-admin users
function requireAdmin(request) {
  const user = verifyToken(request);
  if (!user) {
    return { error: 'Yetkisiz erişim', status: 401 };
  }
  if (user.role !== 'admin') {
    return { error: 'Admin yetkisi gerekli', status: 403 };
  }
  return { user };
}

// Initialize DB with default data
async function initializeDb() {
  const db = await getDb();
  
  // Migrate existing products: rename 'image' to 'imageUrl'
  await db.collection('products').updateMany(
    { image: { $exists: true }, imageUrl: { $exists: false } },
    { $rename: { image: 'imageUrl' } }
  );
  
  // Migrate existing products: add 'game' field (default: 'pubg')
  await db.collection('products').updateMany(
    { game: { $exists: false } },
    { $set: { game: 'pubg' } }
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

  // DijiPin ayarlarını otomatik aktif et (60 UC ve 325 UC için)
  const dijipinSettings = await db.collection('settings').findOne({ type: 'dijipin' });
  if (!dijipinSettings) {
    await db.collection('settings').insertOne({
      type: 'dijipin',
      isEnabled: true,
      supportedProducts: ['60 UC', '325 UC'],
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system'
    });
    console.log('DijiPin settings initialized and enabled');
  }
}

// API Routes Handler
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  
  try {
    await initializeDb();
    const db = await getDb();

    // Healthcheck endpoint
    if (pathname === '/api/health') {
      return NextResponse.json({ 
        ok: true, 
        version: APP_VERSION, 
        time: new Date().toISOString(),
        uptime: process.uptime()
      });
    }

    // Root endpoint
    if (pathname === '/api' || pathname === '/api/') {
      return NextResponse.json({ message: 'PINLY API v1.0', status: 'ok', version: APP_VERSION });
    }

    // Rate limiting for GET endpoints
    const user = verifyToken(request);
    const rateLimit = checkRateLimit(pathname, request, user);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', message: 'Çok fazla istek gönderildi. Lütfen bekleyin.' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    // ============================================
    // 🚀 HOMEPAGE - TÜM VERİLER TEK SEFERDE
    // ============================================
    if (pathname === '/api/homepage') {
      const gameFilter = searchParams.get('game'); // 'pubg', 'valorant', or null
      const cacheKey = gameFilter ? `homepage_${gameFilter}` : 'homepage_all';
      let data = getCached(cacheKey);
      
      if (!data) {
        // Build product query
        const productQuery = { active: true };
        if (gameFilter) {
          productQuery.game = gameFilter;
        }
        
        // Tüm verileri paralel olarak çek
        const [
          products,
          accounts,
          siteSettings,
          footerSettings,
          seoSettings,
          regions,
          gameContent,
          reviewsData
        ] = await Promise.all([
          // Products (filtered by game if specified)
          db.collection('products').find(productQuery).sort({ sortOrder: 1 }).toArray(),
          
          // Accounts
          db.collection('accounts').find({ active: true, status: 'available' }).sort({ order: 1 }).toArray(),
          
          // Site Settings
          db.collection('site_settings').findOne({ active: true }),
          
          // Footer Settings
          db.collection('footer_settings').findOne({ active: true }),
          
          // SEO Settings
          db.collection('seo_settings').findOne({ active: true }),
          
          // Regions
          db.collection('regions').find({ enabled: true }).sort({ sortOrder: 1 }).toArray(),
          
          // Game Content
          db.collection('game_content').findOne({ game: 'pubg' }),
          
          // Reviews with stats
          (async () => {
            const reviews = await db.collection('reviews')
              .find({ game: 'pubg', approved: true })
              .sort({ createdAt: -1 })
              .limit(5)
              .toArray();
            
            const ratingAgg = await db.collection('reviews').aggregate([
              { $match: { game: 'pubg', approved: true } },
              { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]).toArray();
            
            return { reviews, ratingAgg };
          })()
        ]);

        // Process accounts (hide sensitive info)
        const publicAccounts = accounts.map(acc => ({
          id: acc.id,
          title: acc.title,
          description: acc.description,
          price: acc.price,
          discountPrice: acc.discountPrice,
          imageUrl: acc.imageUrl,
          legendaryMin: acc.legendaryMin,
          legendaryMax: acc.legendaryMax,
          level: acc.level,
          rank: acc.rank,
          features: acc.features,
          order: acc.order || 0
        }));

        // Process regions
        const processedRegions = regions.length > 0 ? regions : [
          { id: 'tr', code: 'TR', name: 'Türkiye', enabled: true, sortOrder: 1 },
          { id: 'global', code: 'GLOBAL', name: 'Küresel', enabled: true, sortOrder: 2 }
        ];

        // Process reviews stats
        let avgRating = 5.0, reviewCount = 0;
        if (reviewsData.ratingAgg.length > 0 && reviewsData.ratingAgg[0].count > 0) {
          avgRating = Math.round(reviewsData.ratingAgg[0].avgRating * 10) / 10;
          reviewCount = reviewsData.ratingAgg[0].count;
        } else if (gameContent) {
          avgRating = gameContent.defaultRating || 5.0;
          reviewCount = gameContent.defaultReviewCount || 0;
        }

        data = {
          products,
          accounts: publicAccounts,
          siteSettings: {
            logo: siteSettings?.logo || null,
            favicon: siteSettings?.favicon || null,
            heroImage: siteSettings?.heroImage || null,
            valorantHeroImage: siteSettings?.valorantHeroImage || null,
            mlbbHeroImage: siteSettings?.mlbbHeroImage || null,
            categoryIcon: siteSettings?.categoryIcon || null,
            siteName: siteSettings?.siteName || 'PINLY',
            metaTitle: siteSettings?.metaTitle || 'PINLY – Dijital Kod ve Oyun Satış Platformu',
            metaDescription: siteSettings?.metaDescription || 'PUBG Mobile UC satın al.',
            contactEmail: siteSettings?.contactEmail || '',
            contactPhone: siteSettings?.contactPhone || '',
            dailyBannerEnabled: siteSettings?.dailyBannerEnabled !== false,
            dailyBannerTitle: siteSettings?.dailyBannerTitle || 'Bugüne Özel Fiyatlar',
            dailyBannerSubtitle: siteSettings?.dailyBannerSubtitle || '',
            dailyBannerIcon: siteSettings?.dailyBannerIcon || 'fire',
            dailyCountdownEnabled: siteSettings?.dailyCountdownEnabled !== false,
            dailyCountdownLabel: siteSettings?.dailyCountdownLabel || 'Kampanya bitimine'
          },
          footerSettings: footerSettings || {
            companyName: 'PINLY',
            companyDescription: 'Güvenilir oyun kodu satış platformu',
            quickLinks: [],
            copyrightText: '© 2025 PINLY'
          },
          seoSettings: {
            ga4MeasurementId: seoSettings?.enableAnalytics ? seoSettings.ga4MeasurementId : null,
            gscVerificationCode: seoSettings?.enableSearchConsole ? seoSettings.gscVerificationCode : null
          },
          regions: processedRegions,
          gameContent: gameContent || { title: 'PUBG Mobile', description: '' },
          reviews: {
            items: reviewsData.reviews,
            stats: { avgRating, reviewCount }
          }
        };
        
        setCache(cacheKey, data, 60000); // 1 dakika cache
      }
      
      return NextResponse.json({ success: true, data });
    }

    // Get all products - WITH CACHE (supports game filter)
    if (pathname === '/api/products') {
      const game = searchParams.get('game'); // 'pubg', 'valorant', or null (all)
      const cacheKey = game ? `products_active_${game}` : 'products_active';
      let products = getCached(cacheKey);
      
      if (!products) {
        const query = { active: true };
        if (game) {
          query.game = game;
        }
        products = await db.collection('products')
          .find(query)
          .sort({ sortOrder: 1 })
          .toArray();
        setCache(cacheKey, products, 120000); // 2 dakika cache
      }
      
      return NextResponse.json({ success: true, data: products });
    }

    // ============================================
    // 🎮 PUBG HESAP SATIŞ API - PUBLIC GET ENDPOINTS
    // ============================================

    // Public: Get all active accounts - WITH CACHE
    if (pathname === '/api/accounts') {
      const cacheKey = 'accounts_active';
      let publicAccounts = getCached(cacheKey);
      
      if (!publicAccounts) {
        const accounts = await db.collection('accounts')
          .find({ active: true, status: 'available' })
          .sort({ order: 1, createdAt: -1 })
          .toArray();

        // Hide sensitive info
        publicAccounts = accounts.map(acc => ({
          id: acc.id,
          title: acc.title,
          description: acc.description,
          price: acc.price,
          discountPrice: acc.discountPrice,
          discountPercent: acc.discountPercent,
          imageUrl: acc.imageUrl,
          legendaryMin: acc.legendaryMin,
          legendaryMax: acc.legendaryMax,
          level: acc.level,
          rank: acc.rank,
          features: acc.features,
          order: acc.order || 0,
          createdAt: acc.createdAt
        }));
        
        setCache(cacheKey, publicAccounts, 120000); // 2 dakika cache
      }

      return NextResponse.json({ success: true, data: publicAccounts });
    }

    // Public: Get single account
    if (pathname.match(/^\/api\/accounts\/([^\/]+)$/)) {
      const accountId = pathname.split('/').pop();
      const account = await db.collection('accounts').findOne({ 
        id: accountId, 
        active: true, 
        status: 'available' 
      });

      if (!account) {
        return NextResponse.json({ success: false, error: 'Hesap bulunamadı' }, { status: 404 });
      }

      // Hide sensitive info
      const publicAccount = {
        id: account.id,
        title: account.title,
        description: account.description,
        price: account.price,
        discountPrice: account.discountPrice,
        discountPercent: account.discountPercent,
        imageUrl: account.imageUrl,
        legendaryMin: account.legendaryMin,
        legendaryMax: account.legendaryMax,
        level: account.level,
        rank: account.rank,
        features: account.features,
        createdAt: account.createdAt
      };

      return NextResponse.json({ success: true, data: publicAccount });
    }

    // Admin: Get all accounts (including inactive and sold)
    if (pathname === '/api/admin/accounts') {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const accounts = await db.collection('accounts')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({ success: true, data: accounts });
    }

    // Admin: Get single account
    if (pathname.match(/^\/api\/admin\/accounts\/([^\/]+)$/)) {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const accountId = pathname.split('/').pop();
      const account = await db.collection('accounts').findOne({ id: accountId });

      if (!account) {
        return NextResponse.json({ success: false, error: 'Hesap bulunamadı' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: account });
    }

    // Admin: Get account stock
    if (pathname.match(/^\/api\/admin\/accounts\/[^\/]+\/stock$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const accountId = pathname.split('/')[4];
      
      // Get stock items for this account
      const stocks = await db.collection('account_stock')
        .find({ accountId })
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

    // Validate Reset Token (check if token is valid before showing form)
    if (pathname === '/api/auth/validate-reset-token') {
      const token = searchParams.get('token');

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Token gereklidir', valid: false },
          { status: 400 }
        );
      }

      const resetRecord = await db.collection('password_resets').findOne({
        token: token,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      return NextResponse.json({
        success: !!resetRecord,
        valid: !!resetRecord
      });
    }

    // Resolve player name (Real PUBG Mobile API via RapidAPI - ID Game Checker)
    if (pathname === '/api/player/resolve') {
      // Accept both 'id' and 'playerId' parameters
      const playerId = searchParams.get('playerId') || searchParams.get('id');
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

    // Admin: Get all orders (UC + Account Orders combined)
    if (pathname === '/api/admin/orders') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const status = searchParams.get('status');
      const riskStatus = searchParams.get('riskStatus'); // FLAGGED | CLEAR
      const deliveryStatus = searchParams.get('deliveryStatus'); // hold | pending | delivered
      
      let query = {};
      if (status) query.status = status;
      if (riskStatus) query['risk.status'] = riskStatus;
      if (deliveryStatus) query['delivery.status'] = deliveryStatus;
      
      // Fetch UC orders
      const ucOrders = await db.collection('orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      // Fetch Account orders
      const accountOrders = await db.collection('account_orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      // Mark account orders with orderType
      const markedAccountOrders = accountOrders.map(order => ({
        ...order,
        orderType: 'account'
      }));
      
      // Combine both order types
      const allOrders = [...ucOrders, ...markedAccountOrders];
      
      // Sort by date (newest first)
      allOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Get user details for each order
      const userIds = [...new Set(allOrders.map(o => o.userId).filter(Boolean))];
      const users = await db.collection('users').find({ id: { $in: userIds } }).toArray();
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u; });
      
      // Enrich orders with user info
      const enrichedOrders = allOrders.map(order => {
        const user = userMap[order.userId];
        return {
          ...order,
          userEmail: user?.email || null,
          userPhone: user?.phone || null,
          userName: user?.name || user?.email?.split('@')[0] || null
        };
      });
      
      // Add flagged count for badge (both order types)
      const ucFlaggedCount = await db.collection('orders').countDocuments({ 
        'risk.status': 'FLAGGED',
        'delivery.status': 'hold'
      });
      const accountFlaggedCount = await db.collection('account_orders').countDocuments({ 
        'risk.status': 'FLAGGED',
        'delivery.status': 'hold'
      });
      const flaggedCount = ucFlaggedCount + accountFlaggedCount;
      
      return NextResponse.json({ 
        success: true, 
        data: enrichedOrders,
        meta: { flaggedCount }
      });
    }

    // Admin: Get orders pending verification (MUST BE BEFORE single order endpoint)
    if (pathname === '/api/admin/orders/pending-verification') {
      console.log('=== PENDING VERIFICATION ENDPOINT HIT ===');
      
      const adminUser = verifyAdminToken(request);
      console.log('Admin User:', adminUser ? adminUser.username : 'NO ADMIN USER');
      
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const pendingOrders = await db.collection('orders').find({
        'verification.required': true,
        'verification.status': 'pending',
        'verification.submittedAt': { $ne: null }
      }).sort({ 'verification.submittedAt': -1 }).toArray();

      console.log('Pending Orders Found:', pendingOrders.length);

      // Populate user info
      const ordersWithUsers = await Promise.all(pendingOrders.map(async (order) => {
        const user = await db.collection('users').findOne({ id: order.userId });
        return {
          ...order,
          userEmail: user?.email || 'N/A',
          userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
        };
      }));

      console.log('=== RETURNING', ordersWithUsers.length, 'ORDERS ===');

      return NextResponse.json({
        success: true,
        data: ordersWithUsers
      });
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

      // Get user details
      let userInfo = null;
      if (order.userId) {
        const orderUser = await db.collection('users').findOne({ id: order.userId });
        if (orderUser) {
          userInfo = {
            email: orderUser.email,
            phone: orderUser.phone,
            name: orderUser.name || orderUser.email?.split('@')[0]
          };
        }
      }

      // Get payment details
      const payment = await db.collection('payments').findOne({ orderId });
      
      return NextResponse.json({
        success: true,
        data: { 
          order: {
            ...order,
            userEmail: userInfo?.email || null,
            userPhone: userInfo?.phone || null,
            userName: userInfo?.name || null
          }, 
          payment 
        }
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

    // Admin: Get Audit Logs
    if (pathname === '/api/admin/audit-logs') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 50;
      const action = searchParams.get('action');
      const entityType = searchParams.get('entityType');
      const actorId = searchParams.get('actorId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Build query
      const query = {};
      if (action) query.action = action;
      if (entityType) query.entityType = entityType;
      if (actorId) query.actorId = actorId;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const total = await db.collection('audit_logs').countDocuments(query);
      const logs = await db.collection('audit_logs')
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      // Get unique action types for filter dropdown
      const actionTypes = await db.collection('audit_logs').distinct('action');
      const entityTypes = await db.collection('audit_logs').distinct('entityType');

      return NextResponse.json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          },
          filters: {
            actionTypes,
            entityTypes
          }
        }
      });
    }

    // Admin: Get system health/status
    if (pathname === '/api/admin/system-status') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      // Get various counts for system status
      const usersCount = await db.collection('users').countDocuments();
      const ordersToday = await db.collection('orders').countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      });
      const pendingOrders = await db.collection('orders').countDocuments({ status: 'pending' });
      const availableStock = await db.collection('stocks').countDocuments({ status: 'available' });
      const openTickets = await db.collection('tickets').countDocuments({ status: { $ne: 'closed' } });

      return NextResponse.json({
        success: true,
        data: {
          version: APP_VERSION,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          metrics: {
            totalUsers: usersCount,
            ordersToday,
            pendingOrders,
            availableStock,
            openTickets
          },
          status: 'healthy'
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
          apiKey: settings.apiKey ? maskSensitiveData(decrypt(settings.apiKey)) : null,
          mode: settings.mode || 'production',
          updatedBy: settings.updatedBy,
          updatedAt: settings.updatedAt
        }
      });
    }

    // Admin: Get Google OAuth Settings (GET)
    if (pathname === '/api/admin/settings/oauth/google') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const oauthSettings = await db.collection('oauth_settings').findOne({ provider: 'google' });
      
      // Get base URL from request headers (for correct domain)
      const host = request.headers.get('host');
      // x-forwarded-proto can be "https, https" from multiple proxies, take first value
      const protoHeader = request.headers.get('x-forwarded-proto') || 'https';
      const protocol = protoHeader.split(',')[0].trim();
      const requestBaseUrl = `${protocol}://${host}`;
      
      // Fallback to site settings or env
      const siteSettings = await db.collection('site_settings').findOne({ active: true });
      const baseUrl = requestBaseUrl || siteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      return NextResponse.json({
        success: true,
        data: {
          enabled: oauthSettings?.enabled || false,
          clientId: oauthSettings?.clientId ? maskSensitiveData(decrypt(oauthSettings.clientId)) : '',
          clientSecret: oauthSettings?.clientSecret ? '••••••••' : '',
          hasClientId: !!oauthSettings?.clientId,
          hasClientSecret: !!oauthSettings?.clientSecret,
          baseUrl: baseUrl,
          redirectUri: `${baseUrl}/api/auth/google/callback`,
          authorizedOrigin: baseUrl,
          updatedBy: oauthSettings?.updatedBy || null,
          updatedAt: oauthSettings?.updatedAt || null
        }
      });
    }

    // Admin: Get SEO Settings (GET)
    if (pathname === '/api/admin/settings/seo') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const seoSettings = await db.collection('seo_settings').findOne({ active: true });

      return NextResponse.json({
        success: true,
        data: seoSettings ? {
          ga4MeasurementId: seoSettings.ga4MeasurementId || '',
          gscVerificationCode: seoSettings.gscVerificationCode || '',
          enableAnalytics: seoSettings.enableAnalytics !== false,
          enableSearchConsole: seoSettings.enableSearchConsole !== false,
          updatedBy: seoSettings.updatedBy,
          updatedAt: seoSettings.updatedAt
        } : null
      });
    }

    // Public: Get SEO Settings for frontend (limited data)
    if (pathname === '/api/seo/settings') {
      const cacheKey = 'seo_settings';
      let data = getCached(cacheKey);
      
      if (!data) {
        const seoSettings = await db.collection('seo_settings').findOne({ active: true });
        data = {
          ga4MeasurementId: seoSettings?.enableAnalytics ? seoSettings.ga4MeasurementId : null,
          gscVerificationCode: seoSettings?.enableSearchConsole ? seoSettings.gscVerificationCode : null
        };
        setCache(cacheKey, data, 300000); // 5 dakika cache
      }

      return NextResponse.json({ success: true, data });
    }

    // User: Get single order by ID
    if (pathname.match(/^\/api\/account\/orders\/([^\/]+)$/)) {
      try {
        const authUser = verifyToken(request);
        if (!authUser || authUser.type !== 'user') {
          return NextResponse.json(
            { success: false, error: 'Giriş yapmalısınız' },
            { status: 401 }
          );
        }

        const orderId = pathname.match(/^\/api\/account\/orders\/([^\/]+)$/)[1];
        
        const order = await db.collection('orders').findOne({ 
          id: orderId, 
          userId: authUser.id 
        });

        if (!order) {
          return NextResponse.json(
            { success: false, error: 'Sipariş bulunamadı' },
            { status: 404 }
          );
        }

        // Hide internal risk data
        const userOrder = { ...order };
        delete userOrder.risk;
        delete userOrder.meta;

        return NextResponse.json({
          success: true,
          data: userOrder
        });
      } catch (error) {
        console.error('Single order fetch error:', error);
        return NextResponse.json(
          { success: false, error: 'Sipariş getirilemedi' },
          { status: 500 }
        );
      }
    }

    // User: Get all orders
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

      // Transform orders - hide risk details, show user-friendly message
      const userOrders = orders.map(order => {
        const userOrder = { ...order };
        
        // Hide internal risk data from users
        delete userOrder.risk;
        delete userOrder.meta;
        
        // Show user-friendly delivery status
        if (order.delivery?.status === 'hold') {
          userOrder.userDeliveryStatus = 'review';
          userOrder.userDeliveryMessage = 'Siparişiniz kontrol aşamasındadır. En kısa sürede sonuçlandırılacaktır.';
        } else if (order.delivery?.status === 'pending') {
          userOrder.userDeliveryStatus = 'pending';
          userOrder.userDeliveryMessage = 'Siparişiniz hazırlanıyor.';
        } else if (order.delivery?.status === 'delivered') {
          userOrder.userDeliveryStatus = 'delivered';
          userOrder.userDeliveryMessage = 'Siparişiniz teslim edildi.';
        } else if (order.delivery?.status === 'cancelled') {
          userOrder.userDeliveryStatus = 'cancelled';
          userOrder.userDeliveryMessage = 'Sipariş iptal edildi / iade yapıldı.';
        }
        
        return userOrder;
      });

      return NextResponse.json({
        success: true,
        data: userOrders
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

    // Admin: Get SMS settings
    if (pathname === '/api/admin/settings/sms') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const settings = await db.collection('sms_settings').findOne({ id: 'main' });
      
      return NextResponse.json({
        success: true,
        data: settings ? {
          ...settings,
          password: settings.password ? '********' : '' // Şifreyi maskele
        } : {
          id: 'main',
          enabled: false,
          usercode: '',
          password: '',
          msgheader: 'PINLY',
          sendOnPayment: true,
          sendOnDelivery: true
        }
      });
    }

    // Admin: Get SMS logs
    if (pathname === '/api/admin/settings/sms/logs') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 20;
      const skip = (page - 1) * limit;

      const logs = await db.collection('sms_logs')
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await db.collection('sms_logs').countDocuments();

      return NextResponse.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // Admin: NetGSM Gönderici Adı (Başlık) Sorgula - GET
    if (pathname === '/api/admin/settings/sms/headers') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const settings = await db.collection('sms_settings').findOne({ id: 'main' });
      
      if (!settings || !settings.usercode || !settings.password) {
        return NextResponse.json({
          success: false,
          error: 'SMS ayarları yapılmamış. Önce kullanıcı kodu ve şifre girin ve kaydedin.'
        });
      }

      try {
        // Şifreyi decrypt et
        let password = settings.password;
        try {
          password = decrypt(settings.password);
        } catch (e) {
          console.log('Password decrypt failed, using as-is');
        }

        // NetGSM Gönderici Adı Sorgulama API
        const apiUrl = 'https://api.netgsm.com.tr/sms/rest/v2/msgheader';
        const credentials = Buffer.from(`${settings.usercode}:${password}`).toString('base64');

        console.log('Fetching NetGSM headers for usercode:', settings.usercode);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();
        console.log('NetGSM headers response:', JSON.stringify(result));

        if (result.msgheader && Array.isArray(result.msgheader)) {
          return NextResponse.json({
            success: true,
            data: result.msgheader,
            message: `${result.msgheader.length} adet gönderici adı bulundu`
          });
        } else if (result.code === '30') {
          return NextResponse.json({
            success: false,
            error: 'Geçersiz kullanıcı adı/şifre veya API erişim izni yok. Alt kullanıcı şifresini kullandığınızdan emin olun.'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Gönderici adı bulunamadı. NetGSM panelinden başlık tanımlamanız gerekebilir.',
            data: result
          });
        }
      } catch (error) {
        console.error('NetGSM headers error:', error);
        return NextResponse.json({
          success: false,
          error: 'NetGSM API hatası: ' + error.message
        });
      }
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
          siteName: 'PINLY',
          metaTitle: 'PINLY – Dijital Kod ve Oyun Satış Platformu',
          metaDescription: 'PUBG Mobile UC satın al. Güvenilir, hızlı ve uygun fiyatlı UC satış platformu.',
          contactEmail: '',
          contactPhone: '',
          dailyBannerEnabled: true,
          dailyBannerTitle: 'Bugüne Özel Fiyatlar',
          dailyBannerSubtitle: '',
          dailyBannerIcon: 'fire',
          dailyCountdownEnabled: true,
          dailyCountdownLabel: 'Kampanya bitimine',
          active: true
        }
      });
    }

    // Public: Get site settings (for frontend) - WITH CACHE
    if (pathname === '/api/site/settings') {
      const cacheKey = 'site_settings';
      let data = getCached(cacheKey);
      
      if (!data) {
        const settings = await db.collection('site_settings').findOne({ active: true });
        data = {
          logo: settings?.logo || null,
          favicon: settings?.favicon || null,
          heroImage: settings?.heroImage || null,
          valorantHeroImage: settings?.valorantHeroImage || null,
          mlbbHeroImage: settings?.mlbbHeroImage || null,
          categoryIcon: settings?.categoryIcon || null,
          siteName: settings?.siteName || 'PINLY',
          metaTitle: settings?.metaTitle || 'PINLY – Dijital Kod ve Oyun Satış Platformu',
          metaDescription: settings?.metaDescription || 'PUBG Mobile UC satın al. Güvenilir, hızlı ve uygun fiyatlı UC satış platformu.',
          contactEmail: settings?.contactEmail || '',
          contactPhone: settings?.contactPhone || '',
          dailyBannerEnabled: settings?.dailyBannerEnabled !== false,
          dailyBannerTitle: settings?.dailyBannerTitle || 'Bugüne Özel Fiyatlar',
          dailyBannerSubtitle: settings?.dailyBannerSubtitle || '',
          dailyBannerIcon: settings?.dailyBannerIcon || 'fire',
          dailyCountdownEnabled: settings?.dailyCountdownEnabled !== false,
          dailyCountdownLabel: settings?.dailyCountdownLabel || 'Kampanya bitimine'
        };
        setCache(cacheKey, data, 300000); // 5 dakika cache
      }
      
      return NextResponse.json({ success: true, data });
    }

    // Public: Get daily banner settings - WITH CACHE
    if (pathname === '/api/site/banner') {
      const cacheKey = 'site_banner';
      let data = getCached(cacheKey);
      
      if (!data) {
        const settings = await db.collection('site_settings').findOne({ active: true });
        data = {
          enabled: settings?.dailyBannerEnabled !== false,
          title: settings?.dailyBannerTitle || 'Bugüne Özel Fiyatlar',
          subtitle: settings?.dailyBannerSubtitle || '',
          icon: settings?.dailyBannerIcon || 'fire',
          countdownEnabled: settings?.dailyCountdownEnabled !== false,
          countdownLabel: settings?.dailyCountdownLabel || 'Kampanya bitimine'
        };
        setCache(cacheKey, data, 300000); // 5 dakika cache
      }
      
      return NextResponse.json({ success: true, data });
    }

    // Public: Get order summary for payment success page (limited data - no sensitive info)
    if (pathname.match(/^\/api\/orders\/([^\/]+)\/summary$/)) {
      const orderId = pathname.match(/^\/api\/orders\/([^\/]+)\/summary$/)[1];
      
      const order = await db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }
      
      // Return only safe, non-sensitive order summary data
      return NextResponse.json({
        success: true,
        data: {
          id: order.id,
          productTitle: order.productTitle,
          amount: order.amount || order.totalAmount,
          status: order.status,
          customer: order.customer ? {
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            email: order.customer.email,
            phone: order.customer.phone
          } : null,
          verification: order.verification ? {
            required: order.verification.required,
            status: order.verification.status,
            submittedAt: order.verification.submittedAt
          } : null,
          delivery: order.delivery ? {
            status: order.delivery.status
          } : null,
          createdAt: order.createdAt
        }
      });
    }

    // Public: Get enabled regions (for frontend filter) - WITH CACHE
    if (pathname === '/api/regions') {
      const cacheKey = 'regions_enabled';
      let regions = getCached(cacheKey);
      
      if (!regions) {
        regions = await db.collection('regions').find({ enabled: true }).sort({ sortOrder: 1 }).toArray();
        
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
        setCache(cacheKey, regions, 300000); // 5 dakika cache
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

    // Public: Get game content (description, etc.) - WITH CACHE
    if (pathname === '/api/content/pubg') {
      const cacheKey = 'content_pubg';
      let content = getCached(cacheKey);
      
      if (!content) {
        content = await db.collection('game_content').findOne({ game: 'pubg' });
        
        // Default content if not exists
        if (!content) {
          content = {
            game: 'pubg',
            title: 'PUBG Mobile',
            description: `PUBG Mobile UC satın alarak oyun içi avantajlar elde edin.`,
            defaultRating: 5.0,
            defaultReviewCount: 2008,
            updatedAt: new Date()
          };
        }
        setCache(cacheKey, content, 300000); // 5 dakika cache
      }
      
      return NextResponse.json({ success: true, data: content });
    }

    // Public: Get reviews with pagination - WITH CACHE
    if (pathname === '/api/reviews') {
      const game = searchParams.get('game') || 'pubg';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '5');
      const skip = (page - 1) * limit;
      
      const cacheKey = `reviews_${game}_${page}_${limit}`;
      let cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return NextResponse.json({ success: true, data: cachedData });
      }

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

      const data = {
        reviews,
        pagination: {
          page,
          limit,
          total: totalReviews,
          pages: Math.ceil(totalReviews / limit)
        },
        stats: {
          avgRating,
          reviewCount
        }
      };
      
      setCache(cacheKey, data, 120000); // 2 dakika cache

      return NextResponse.json({ success: true, data });
    }

    // Public: Get footer settings - WITH CACHE
    if (pathname === '/api/footer-settings') {
      const cacheKey = 'footer_settings';
      let data = getCached(cacheKey);
      
      if (!data) {
        const settings = await db.collection('footer_settings').findOne({ active: true });
        data = settings || {
          companyName: 'PINLY',
          companyDescription: 'Güvenilir oyun kodu ve dijital ürün satış platformu',
          socialLinks: {},
          quickLinks: [],
          supportLinks: [],
          copyrightText: '© 2025 PINLY. Tüm hakları saklıdır.'
        };
        setCache(cacheKey, data, 300000); // 5 dakika cache
      }
      
      return NextResponse.json({ success: true, data });
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

    // Admin: Get email settings
    if (pathname === '/api/admin/email/settings') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const settings = await db.collection('email_settings').findOne({ id: 'main' });
      
      if (!settings) {
        return NextResponse.json({
          success: true,
          data: {
            enableEmail: false,
            fromName: '',
            fromEmail: '',
            smtpHost: '',
            smtpPort: '587',
            smtpSecure: false,
            smtpUser: '',
            smtpPass: '',
            testRecipientEmail: ''
          }
        });
      }
      
      // Don't send actual password, send masked version
      return NextResponse.json({
        success: true,
        data: {
          ...settings,
          smtpPass: settings.smtpPass ? '••••••••' : ''
        }
      });
    }

    // Admin: Get email logs
    if (pathname === '/api/admin/email/logs') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const logs = await db.collection('email_logs')
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      
      return NextResponse.json({ success: true, data: logs });
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

    // ============================================
    // RISK MANAGEMENT API ENDPOINTS
    // ============================================

    // Admin: Get risk settings
    if (pathname === '/api/admin/risk/settings') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      let settings = await db.collection('risk_settings').findOne({ id: 'main' });
      if (!settings) {
        // Return defaults if not configured
        settings = { ...DEFAULT_RISK_SETTINGS, id: 'main' };
      }

      return NextResponse.json({ success: true, data: settings });
    }

    // Admin: Get blacklist
    if (pathname === '/api/admin/risk/blacklist') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const type = searchParams.get('type');
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 50;

      let query = {};
      if (type) query.type = type;
      if (search) {
        query.value = { $regex: search, $options: 'i' };
      }

      const total = await db.collection('blacklist').countDocuments(query);
      const items = await db.collection('blacklist')
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      return NextResponse.json({
        success: true,
        data: items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // ============================================
    // BLOG / NEWS API ENDPOINTS
    // ============================================

    // Public: Get all published blog posts
    if (pathname === '/api/blog') {
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 10;
      const category = searchParams.get('category');

      let query = { status: 'published' };
      if (category) query.category = category;

      const total = await db.collection('blog_posts').countDocuments(query);
      const posts = await db.collection('blog_posts')
        .find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      return NextResponse.json({
        success: true,
        data: posts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // Public: Get single blog post by slug
    if (pathname.match(/^\/api\/blog\/[^\/]+$/)) {
      const slug = pathname.split('/').pop();
      
      const post = await db.collection('blog_posts').findOne({ 
        slug,
        status: 'published'
      });

      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Yazı bulunamadı' },
          { status: 404 }
        );
      }

      // Increment view count
      await db.collection('blog_posts').updateOne(
        { id: post.id },
        { $inc: { views: 1 } }
      );

      return NextResponse.json({
        success: true,
        data: { ...post, views: (post.views || 0) + 1 }
      });
    }

    // Admin: Get all blog posts (including drafts)
    if (pathname === '/api/admin/blog') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 20;
      const status = searchParams.get('status');

      let query = {};
      if (status) query.status = status;

      const total = await db.collection('blog_posts').countDocuments(query);
      const posts = await db.collection('blog_posts')
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      return NextResponse.json({
        success: true,
        data: posts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // Admin: Get single blog post for editing
    if (pathname.match(/^\/api\/admin\/blog\/[^\/]+$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const postId = pathname.split('/').pop();
      const post = await db.collection('blog_posts').findOne({ id: postId });

      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Yazı bulunamadı' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: post
      });
    }

    // Admin: Get risk logs
    if (pathname === '/api/admin/risk/logs') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 50;

      let query = {};
      if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from);
        if (to) query.createdAt.$lte = new Date(to);
      }
      if (status) query.status = status;

      const total = await db.collection('risk_logs').countDocuments(query);
      const logs = await db.collection('risk_logs')
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      // Get order info for each log
      const orderIds = logs.map(l => l.orderId).filter(Boolean);
      const orders = await db.collection('orders').find({ id: { $in: orderIds } }).toArray();
      const orderMap = {};
      orders.forEach(o => { orderMap[o.id] = o; });

      const enrichedLogs = logs.map(log => ({
        ...log,
        order: orderMap[log.orderId] ? {
          id: orderMap[log.orderId].id,
          amount: orderMap[log.orderId].amount,
          status: orderMap[log.orderId].status,
          productTitle: orderMap[log.orderId].productTitle
        } : null
      }));

      return NextResponse.json({
        success: true,
        data: enrichedLogs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // Admin: Get disposable domains list
    if (pathname === '/api/admin/risk/disposable-domains') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      // Get custom domains from blacklist
      const customDomains = await db.collection('blacklist')
        .find({ type: 'domain', isActive: true })
        .toArray();

      return NextResponse.json({
        success: true,
        data: {
          builtIn: DISPOSABLE_EMAIL_DOMAINS,
          custom: customDomains.map(d => d.value)
        }
      });
    }

    // ============================================
    // SPIN WHEEL - ÇARK ÇEVİR SİSTEMİ (GET)
    // ============================================
    
    // Çark ayarlarını getir
    if (pathname === '/api/spin-wheel/settings') {
      const settings = await db.collection('settings').findOne({ type: 'spin_wheel' });
      
      const defaultSettings = {
        type: 'spin_wheel',
        isEnabled: true,
        prizes: [
          { id: 1, name: '150₺ İndirim', amount: 150, minOrder: 1500, chance: 2, color: '#FFD700' },
          { id: 2, name: '100₺ İndirim', amount: 100, minOrder: 1000, chance: 5, color: '#FF6B00' },
          { id: 3, name: '50₺ İndirim', amount: 50, minOrder: 500, chance: 15, color: '#3B82F6' },
          { id: 4, name: '25₺ İndirim', amount: 25, minOrder: 250, chance: 25, color: '#10B981' },
          { id: 5, name: '10₺ İndirim', amount: 10, minOrder: 100, chance: 30, color: '#8B5CF6' },
          { id: 6, name: 'Boş - Tekrar Dene', amount: 0, minOrder: 0, chance: 23, color: '#6B7280' }
        ],
        expiryDays: 7,
        dailySpins: 1
      };
      
      return NextResponse.json({
        success: true,
        data: settings || defaultSettings
      });
    }
    
    // Kullanıcının indirim bakiyesini getir
    if (pathname === '/api/user/discount-balance') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Giriş yapmalısınız' }, { status: 401 });
      }
      
      const token = authHeader.replace('Bearer ', '');
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Geçersiz token' }, { status: 401 });
      }
      
      const spinUser = await db.collection('users').findOne({ id: decoded.userId });
      if (!spinUser) {
        return NextResponse.json({ success: false, error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }
      
      // İndirim süresi dolmuş mu kontrol et
      let discountBalance = spinUser.discountBalance || 0;
      let discountMinOrder = spinUser.discountMinOrder || 0;
      let discountExpiry = spinUser.discountExpiry;
      
      if (discountExpiry && new Date(discountExpiry) < new Date()) {
        await db.collection('users').updateOne(
          { id: spinUser.id },
          { $unset: { discountBalance: '', discountMinOrder: '', discountExpiry: '', discountSource: '' } }
        );
        discountBalance = 0;
        discountMinOrder = 0;
        discountExpiry = null;
      }
      
      // Bugün çevirmiş mi?
      const today = new Date().toISOString().split('T')[0];
      const lastSpin = spinUser.lastSpinDate ? new Date(spinUser.lastSpinDate).toISOString().split('T')[0] : null;
      const canSpin = lastSpin !== today;
      
      return NextResponse.json({
        success: true,
        data: {
          discountBalance,
          discountMinOrder,
          discountExpiry,
          canSpin,
          nextSpinTime: canSpin ? null : getNextMidnight(),
          lastSpinDate: spinUser.lastSpinDate
        }
      });
    }
    
    // ============================================
    // DIJIPIN ADMIN API
    // ============================================
    
    // Get DijiPin settings (admin panel only - no strict auth for simplicity)
    if (pathname === '/api/admin/dijipin/settings') {
      // Check for any authorization header (loose check for admin panel)
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }
      
      const settings = await db.collection('settings').findOne({ type: 'dijipin' });
      const balance = await getDijipinBalance();
      
      return NextResponse.json({
        success: true,
        data: {
          isEnabled: settings?.isEnabled || false,
          isConfigured: !!DIJIPIN_API_TOKEN,
          balance: balance,
          productMap: DIJIPIN_PRODUCT_MAP
        }
      });
    }
    
    // Get DijiPin balance (admin panel only - loose auth check)
    if (pathname === '/api/admin/dijipin/balance') {
      // Check for any authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }
      
      // Check if DijiPin is configured
      if (!DIJIPIN_API_TOKEN || !DIJIPIN_API_KEY) {
        console.log('DijiPin not configured - Token:', !!DIJIPIN_API_TOKEN, 'ApiKey:', !!DIJIPIN_API_KEY);
        return NextResponse.json({
          success: false,
          error: 'DijiPin API yapılandırılmamış. .env dosyasında DIJIPIN_API_TOKEN ve DIJIPIN_API_KEY tanımlı olmalı.'
        });
      }
      
      try {
        // Direct API call for more reliable results
        const response = await fetch('https://dijipinapi.dijipin.com/Customer/Get', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${DIJIPIN_API_TOKEN}`,
            'Apikey': DIJIPIN_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log('DijiPin balance direct response:', JSON.stringify(data));
        
        if (data.success && data.data) {
          return NextResponse.json({
            success: true,
            data: {
              balance: data.data.balance,
              currencyCode: data.data.currencyCode || 'TL',
              customerName: `${data.data.firstName || ''} ${data.data.lastName || ''}`.trim(),
              email: data.data.email
            }
          });
        } else {
          return NextResponse.json({
            success: false,
            error: data.message || 'DijiPin API yanıt vermedi'
          });
        }
      } catch (error) {
        console.error('DijiPin balance error:', error);
        return NextResponse.json({
          success: false,
          error: 'DijiPin bağlantı hatası: ' + error.message
        });
      }
    }

    // Get DijiPin orders (admin panel only - loose auth check)
    if (pathname === '/api/admin/dijipin/orders') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }
      
      // Get orders with DijiPin delivery
      const dijipinOrders = await db.collection('orders')
        .find({ 'delivery.method': 'dijipin_auto' })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      
      // Calculate stats
      const allDijipinOrders = await db.collection('orders')
        .find({ 'delivery.method': 'dijipin_auto' })
        .toArray();
      
      const pendingDijipinOrders = await db.collection('orders')
        .find({ 
          'delivery.status': 'pending',
          'delivery.dijipinError': { $exists: true }
        })
        .toArray();
      
      const stats = {
        totalOrders: allDijipinOrders.length + pendingDijipinOrders.length,
        successfulOrders: allDijipinOrders.filter(o => o.delivery?.status === 'delivered').length,
        failedOrders: pendingDijipinOrders.length,
        pendingOrders: allDijipinOrders.filter(o => o.delivery?.status === 'pending').length
      };
      
      return NextResponse.json({
        success: true,
        data: {
          orders: dijipinOrders,
          stats
        }
      });
    }

    // Customer: Get verification status
    if (pathname.match(/^\/api\/account\/orders\/([^\/]+)\/verification$/)) {
      const user = verifyToken(request);
      if (!user || user.type !== 'user') {
        return NextResponse.json({ success: false, error: 'Giriş gerekli' }, { status: 401 });
      }

      const orderId = pathname.match(/^\/api\/account\/orders\/([^\/]+)\/verification$/)[1];
      
      const order = await db.collection('orders').findOne({ id: orderId, userId: user.id });
      if (!order) {
        return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          required: order.verification?.required || false,
          status: order.verification?.status || 'not_required',
          identityPhoto: order.verification?.identityPhoto || null,
          paymentReceipt: order.verification?.paymentReceipt || null,
          submittedAt: order.verification?.submittedAt || null,
          reviewedAt: order.verification?.reviewedAt || null,
          rejectionReason: order.verification?.rejectionReason || null
        }
      });
    }

    // ============================================
    // 💰 BALANCE SYSTEM ENDPOINTS (GET)
    // ============================================
    
    // Admin: Get all users with balance
    if (pathname === '/api/admin/users') {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const search = searchParams.get('search') || '';
      const dateFilter = searchParams.get('dateFilter') || 'all';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      // Tarih filtreleri için başlangıç tarihleri
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Bu haftanın başlangıcı (Pazartesi)
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      
      // Bu ayın başlangıcı
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Query: tüm kullanıcılar (admin hariç)
      let query = { 
        $or: [
          { type: 'user' },
          { type: { $exists: false } }  // type field'ı olmayanlar da dahil
        ],
        role: { $ne: 'admin' }  // Admin rolü olmayanlar
      };

      // Tarih filtresi
      if (dateFilter === 'today') {
        query.createdAt = { $gte: todayStart };
      } else if (dateFilter === 'week') {
        query.createdAt = { $gte: weekStart };
      } else if (dateFilter === 'month') {
        query.createdAt = { $gte: monthStart };
      }
      
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        });
      }

      // Stats için base query (tarih filtresi hariç)
      const baseQuery = { 
        $or: [
          { type: 'user' },
          { type: { $exists: false } }
        ],
        role: { $ne: 'admin' }
      };

      const [users, total, todayCount, weekCount, monthCount] = await Promise.all([
        db.collection('users')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection('users').countDocuments(query),
        db.collection('users').countDocuments({ ...baseQuery, createdAt: { $gte: todayStart } }),
        db.collection('users').countDocuments({ ...baseQuery, createdAt: { $gte: weekStart } }),
        db.collection('users').countDocuments({ ...baseQuery, createdAt: { $gte: monthStart } })
      ]);

      // Remove password hashes
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return {
          ...safeUser,
          balance: user.balance || 0
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          users: safeUsers,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          },
          stats: {
            todayCount,
            weekCount,
            monthCount
          }
        }
      });
    }

    // Admin: Get single user details
    if (pathname.match(/^\/api\/admin\/users\/([^\/]+)$/)) {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const userId = pathname.match(/^\/api\/admin\/users\/([^\/]+)$/)[1];
      
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }

      // Get balance transaction history
      const transactions = await db.collection('balance_transactions')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      // Get order statistics
      const orderStats = await db.collection('orders').aggregate([
        { $match: { userId } },
        { 
          $group: { 
            _id: null, 
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            paidOrders: { 
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } 
            }
          } 
        }
      ]).toArray();

      const { password, ...safeUser } = user;

      return NextResponse.json({
        success: true,
        data: {
          user: {
            ...safeUser,
            balance: user.balance || 0
          },
          transactions,
          stats: orderStats[0] || { totalOrders: 0, totalSpent: 0, paidOrders: 0 }
        }
      });
    }

    // User: Get own balance
    if (pathname === '/api/account/balance') {
      const user = verifyToken(request);
      if (!user || user.type !== 'user') {
        return NextResponse.json({ success: false, error: 'Giriş gerekli' }, { status: 401 });
      }

      const userData = await db.collection('users').findOne({ id: user.id });
      
      return NextResponse.json({
        success: true,
        data: {
          balance: userData?.balance || 0
        }
      });
    }

    // User: Get balance transaction history
    if (pathname === '/api/account/balance/transactions') {
      const user = verifyToken(request);
      if (!user || user.type !== 'user') {
        return NextResponse.json({ success: false, error: 'Giriş gerekli' }, { status: 401 });
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        db.collection('balance_transactions')
          .find({ userId: user.id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection('balance_transactions').countDocuments({ userId: user.id })
      ]);

      return NextResponse.json({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        }
      });
    }

    // ============================================
    // CRON: Terk Edilmiş Sipariş SMS Gönderimi
    // ============================================
    // Bu endpoint cPanel cron job ile çağrılacak
    // Her 5 dakikada bir: curl https://pinly.com.tr/api/cron/abandoned-sms
    if (pathname === '/api/cron/abandoned-sms') {
      console.log('Cron: Checking abandoned orders for SMS...');
      
      // 15 dakika önce oluşturulmuş ve hala ödenmemiş siparişleri bul
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000); // 20 dakikadan eski olmasın
      
      // Pending durumundaki siparişleri bul (15-20 dakika arası)
      const abandonedOrders = await db.collection('orders').find({
        status: 'pending',
        createdAt: { 
          $gte: twentyMinutesAgo, // 20 dakikadan yeni
          $lte: fifteenMinutesAgo // 15 dakikadan eski
        },
        abandonedSmsSent: { $ne: true } // SMS henüz gönderilmemiş
      }).toArray();
      
      console.log(`Found ${abandonedOrders.length} abandoned orders`);
      
      let sentCount = 0;
      let errorCount = 0;
      
      for (const order of abandonedOrders) {
        try {
          // Kullanıcıyı bul
          const user = await db.collection('users').findOne({ id: order.userId });
          
          if (user && user.phone) {
            // SMS gönder
            const result = await sendAbandonedOrderSms(db, order, user);
            
            // SMS gönderildi olarak işaretle (tekrar gönderilmesin)
            await db.collection('orders').updateOne(
              { id: order.id },
              { 
                $set: { 
                  abandonedSmsSent: true,
                  abandonedSmsSentAt: new Date()
                } 
              }
            );
            
            if (result.success) {
              sentCount++;
              console.log(`Abandoned SMS sent to order ${order.id}`);
            } else {
              errorCount++;
              console.log(`Abandoned SMS failed for order ${order.id}: ${result.reason}`);
            }
          } else {
            // Telefon yoksa da işaretle
            await db.collection('orders').updateOne(
              { id: order.id },
              { $set: { abandonedSmsSent: true, abandonedSmsSkipped: 'no_phone' } }
            );
          }
        } catch (err) {
          errorCount++;
          console.error(`Error processing order ${order.id}:`, err);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Terk edilmiş sipariş kontrolü tamamlandı`,
        data: {
          checked: abandonedOrders.length,
          sent: sentCount,
          errors: errorCount,
          timestamp: new Date().toISOString()
        }
      });
    }

    // ============================================
    // CRON: Ödenen Siparişlere SMS Gönderimi
    // ============================================
    // Bu endpoint cPanel cron job ile çağrılacak
    // Her 2 dakikada bir: curl https://pinly.com.tr/api/cron/payment-sms
    if (pathname === '/api/cron/payment-sms') {
      console.log('Cron: Checking paid orders for SMS...');
      
      // Son 30 dakikada ödenen ve SMS gönderilmemiş siparişleri bul
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      // Paid durumundaki siparişleri bul (SMS gönderilmemiş)
      const paidOrders = await db.collection('orders').find({
        status: { $in: ['paid', 'delivered'] },
        createdAt: { $gte: thirtyMinutesAgo },
        paymentSmsSent: { $ne: true }
      }).toArray();
      
      console.log(`Found ${paidOrders.length} paid orders without SMS`);
      
      let sentCount = 0;
      let errorCount = 0;
      
      for (const order of paidOrders) {
        try {
          // Kullanıcıyı bul
          const user = await db.collection('users').findOne({ id: order.userId });
          
          if (user && user.phone) {
            // Ürün/hesap bilgisi
            const product = order.productId ? await db.collection('products').findOne({ id: order.productId }) : null;
            const account = order.accountId ? await db.collection('accounts').findOne({ id: order.accountId }) : null;
            const itemTitle = product?.title || account?.title || order.productTitle || order.accountTitle || 'Sipariş';
            
            // SMS gönder
            console.log(`Sending payment SMS for order ${order.id} to ${user.phone}`);
            const result = await sendPaymentSuccessSms(db, order, user, itemTitle);
            
            // SMS gönderildi olarak işaretle (tekrar gönderilmesin)
            await db.collection('orders').updateOne(
              { id: order.id },
              { 
                $set: { 
                  paymentSmsSent: true,
                  paymentSmsSentAt: new Date(),
                  paymentSmsResult: result.success ? 'sent' : 'failed'
                } 
              }
            );
            
            if (result.success) {
              sentCount++;
              console.log(`Payment SMS sent for order ${order.id}`);
            } else {
              errorCount++;
              console.log(`Payment SMS failed for order ${order.id}: ${result.reason}`);
            }
          } else {
            // Telefon yoksa da işaretle
            await db.collection('orders').updateOne(
              { id: order.id },
              { $set: { paymentSmsSent: true, paymentSmsSkipped: 'no_phone' } }
            );
            console.log(`Order ${order.id} skipped - no phone number`);
          }
        } catch (err) {
          errorCount++;
          console.error(`Error processing order ${order.id}:`, err);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Ödeme SMS kontrolü tamamlandı`,
        data: {
          checked: paidOrders.length,
          sent: sentCount,
          errors: errorCount,
          timestamp: new Date().toISOString()
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
  const clientIP = getClientIP(request);
  
  try {
    await initializeDb();
    const db = await getDb();
    
    // Rate limiting for POST endpoints
    const user = verifyToken(request);
    const rateLimit = checkRateLimit(pathname, request, user);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', message: 'Çok fazla istek gönderildi. Lütfen bekleyin.' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }
    
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

    // Admin: Close ticket (MUST BE BEFORE body = await request.json() - no body needed)
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
    
    // ============================================
    // SPIN WHEEL - ÇARK ÇEVİRME (POST) - Body parse gerektirmez
    // ============================================
    if (pathname === '/api/spin-wheel/spin') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Giriş yapmalısınız' }, { status: 401 });
      }
      
      const spinToken = authHeader.replace('Bearer ', '');
      let spinDecoded;
      try {
        spinDecoded = jwt.verify(spinToken, JWT_SECRET);
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Geçersiz token' }, { status: 401 });
      }
      
      const spinUser = await db.collection('users').findOne({ id: spinDecoded.userId });
      if (!spinUser) {
        return NextResponse.json({ success: false, error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }
      
      // Çark ayarlarını al
      const wheelSettings = await db.collection('settings').findOne({ type: 'spin_wheel' }) || {
        isEnabled: true,
        prizes: [
          { id: 1, name: '150₺ İndirim', amount: 150, minOrder: 1500, chance: 2, color: '#FFD700' },
          { id: 2, name: '100₺ İndirim', amount: 100, minOrder: 1000, chance: 5, color: '#FF6B00' },
          { id: 3, name: '50₺ İndirim', amount: 50, minOrder: 500, chance: 15, color: '#3B82F6' },
          { id: 4, name: '25₺ İndirim', amount: 25, minOrder: 250, chance: 25, color: '#10B981' },
          { id: 5, name: '10₺ İndirim', amount: 10, minOrder: 100, chance: 30, color: '#8B5CF6' },
          { id: 6, name: 'Boş - Tekrar Dene', amount: 0, minOrder: 0, chance: 23, color: '#6B7280' }
        ],
        expiryDays: 7
      };
      
      if (!wheelSettings.isEnabled) {
        return NextResponse.json({ success: false, error: 'Çark şu an aktif değil' }, { status: 400 });
      }
      
      // Bugün çevirmiş mi kontrol et
      const today = new Date().toISOString().split('T')[0];
      const lastSpin = spinUser.lastSpinDate ? new Date(spinUser.lastSpinDate).toISOString().split('T')[0] : null;
      
      if (lastSpin === today) {
        return NextResponse.json({ 
          success: false, 
          error: 'Bugün zaten çevirdiniz! Yarın tekrar deneyin.',
          nextSpinTime: getNextMidnight()
        }, { status: 400 });
      }
      
      // Ödül seç (ağırlıklı rastgele)
      const prizes = wheelSettings.prizes;
      const totalChance = prizes.reduce((sum, p) => sum + p.chance, 0);
      let random = Math.random() * totalChance;
      let selectedPrize = prizes[prizes.length - 1];
      
      for (const prize of prizes) {
        random -= prize.chance;
        if (random <= 0) {
          selectedPrize = prize;
          break;
        }
      }
      
      // Kullanıcıyı güncelle
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (wheelSettings.expiryDays || 7));
      
      const updateData = {
        lastSpinDate: new Date()
      };
      
      // Eğer ödül varsa (boş değilse) indirim ekle
      if (selectedPrize.amount > 0) {
        updateData.discountBalance = selectedPrize.amount;
        updateData.discountMinOrder = selectedPrize.minOrder;
        updateData.discountExpiry = expiryDate;
        updateData.discountSource = 'spin_wheel';
      }
      
      await db.collection('users').updateOne(
        { id: spinUser.id },
        { $set: updateData }
      );
      
      // Spin geçmişine kaydet
      await db.collection('spin_history').insertOne({
        id: uuidv4(),
        oderId: spinUser.id,
        userName: spinUser.name || spinUser.email,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
        prizeAmount: selectedPrize.amount,
        minOrder: selectedPrize.minOrder,
        createdAt: new Date()
      });
      
      return NextResponse.json({
        success: true,
        prize: {
          id: selectedPrize.id,
          name: selectedPrize.name,
          amount: selectedPrize.amount,
          minOrder: selectedPrize.minOrder,
          color: selectedPrize.color,
          expiryDate: selectedPrize.amount > 0 ? expiryDate : null
        },
        message: selectedPrize.amount > 0 
          ? `Tebrikler! ${selectedPrize.amount}₺ indirim kazandınız!` 
          : 'Maalesef boş çıktı, yarın tekrar deneyin!'
      });
    }
    
    // Customer: Upload verification documents (MUST BE BEFORE body = await request.json())
    if (pathname.match(/^\/api\/account\/orders\/([^\/]+)\/verification$/)) {
      const user = verifyToken(request);
      if (!user || user.type !== 'user') {
        return NextResponse.json({ success: false, error: 'Giriş gerekli' }, { status: 401 });
      }

      const orderId = pathname.match(/^\/api\/account\/orders\/([^\/]+)\/verification$/)[1];
      
      // Get order and verify ownership
      const order = await db.collection('orders').findOne({ id: orderId, userId: user.id });
      if (!order) {
        return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
      }

      // Check if verification is required (either marked or high-value order)
      const orderAmount = order.totalAmount || order.amount || 0;
      const requiresVerification = order.verification?.required || orderAmount >= 3000;

      if (!requiresVerification) {
        return NextResponse.json({ success: false, error: 'Bu sipariş için doğrulama gerekli değil' }, { status: 400 });
      }

      // Initialize verification object if not exists (for old orders)
      if (!order.verification) {
        await db.collection('orders').updateOne(
          { id: orderId },
          {
            $set: {
              verification: {
                required: true,
                status: 'pending',
                identityPhoto: null,
                paymentReceipt: null,
                submittedAt: null,
                reviewedAt: null,
                reviewedBy: null,
                rejectionReason: null
              }
            }
          }
        );
        // Refresh order data
        order.verification = {
          required: true,
          status: 'pending',
          identityPhoto: null,
          paymentReceipt: null,
          submittedAt: null,
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null
        };
      }

      // Check if already submitted
      if (order.verification.status !== 'pending' || order.verification.submittedAt) {
        return NextResponse.json({ success: false, error: 'Doğrulama belgeleri zaten gönderilmiş' }, { status: 400 });
      }

      // Parse multipart form data
      const formData = await request.formData();
      const identityFile = formData.get('identityPhoto');
      const receiptFile = formData.get('paymentReceipt');

      if (!identityFile || !receiptFile) {
        return NextResponse.json({ success: false, error: 'Kimlik fotoğrafı ve ödeme dekontu zorunludur' }, { status: 400 });
      }

      // Save files to /public/uploads/verifications/
      let identityUrl, receiptUrl;
      try {
        identityUrl = await saveUploadedFile(identityFile, 'verifications');
        receiptUrl = await saveUploadedFile(receiptFile, 'verifications');
      } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      // Update order with verification documents
      await db.collection('orders').updateOne(
        { id: orderId },
        {
          $set: {
            'verification.identityPhoto': identityUrl,
            'verification.paymentReceipt': receiptUrl,
            'verification.submittedAt': new Date(),
            'delivery.status': 'verification_pending',
            'delivery.message': 'Doğrulama belgeleri inceleniyor'
          }
        }
      );

      // Log admin notification
      await logAuditAction(db, AUDIT_ACTIONS.ORDER_VERIFICATION_SUBMIT, user.id, 'order', orderId, request, {
        identityPhoto: identityUrl,
        paymentReceipt: receiptUrl
      });

      return NextResponse.json({
        success: true,
        message: 'Doğrulama belgeleri başarıyla yüklendi. Admin incelemesi bekleniyor.'
      });
    }

    // Admin: Manual stock assignment for pending orders (MUST BE BEFORE body parsing - no body needed)
    if (pathname.match(/^\/api\/admin\/orders\/[^\/]+\/assign-stock$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const orderId = pathname.split('/')[4];
      
      const order = await db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // Check if order needs stock assignment
      if (order.delivery?.status === 'delivered') {
        return NextResponse.json(
          { success: false, error: 'Bu siparişe zaten stok atanmış' },
          { status: 400 }
        );
      }

      if (order.status !== 'paid') {
        return NextResponse.json(
          { success: false, error: 'Sadece ödenmiş siparişlere stok atanabilir' },
          { status: 400 }
        );
      }

      // Try to assign stock
      const assignedStock = await db.collection('stock').findOneAndUpdate(
        { 
          productId: order.productId, 
          status: 'available' 
        },
        { 
          $set: { 
            status: 'assigned', 
            orderId: order.id,
            assignedAt: new Date(),
            assignedBy: user.username || user.email
          } 
        },
        { 
          returnDocument: 'after',
          sort: { createdAt: 1 }
        }
      );

      if (assignedStock) {
        // MongoDB returns the document directly
        let stockItem;
        if (assignedStock._id) {
          stockItem = assignedStock;
        } else if (assignedStock.value && assignedStock.value._id) {
          stockItem = assignedStock.value;
        } else {
          stockItem = assignedStock;
        }
        
        const stockCode = stockItem.value;
        
        if (!stockCode) {
          console.error('Stock code is empty. Stock item:', JSON.stringify(stockItem));
          return NextResponse.json(
            { success: false, error: 'Stok kodu boş - lütfen tekrar deneyin' },
            { status: 400 }
          );
        }
        
        await db.collection('orders').updateOne(
          { id: order.id },
          {
            $set: {
              delivery: {
                status: 'delivered',
                items: [stockCode],
                stockId: stockItem.id || stockItem._id?.toString(),
                assignedAt: new Date(),
                assignedBy: user.username || user.email,
                method: 'manual'
              }
            }
          }
        );

        // Send delivery email
        const orderUser = await db.collection('users').findOne({ id: order.userId });
        const product = await db.collection('products').findOne({ id: order.productId });
        if (orderUser && product) {
          sendDeliveredEmail(db, order, orderUser, product, [stockCode]).catch(err => 
            console.error('Delivered email failed:', err)
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Stok başarıyla atandı',
          data: { 
            orderId: order.id,
            stockCode: stockCode,
            deliveryStatus: 'delivered'
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Bu ürün için mevcut stok bulunamadı' },
          { status: 400 }
        );
      }
    }

    // Admin: Assign Account Stock to Order
    if (pathname.match(/^\/api\/admin\/account-orders\/[^\/]+\/assign-stock$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const orderId = pathname.split('/')[4];
      
      // Parse body for stockId
      let body = {};
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch (e) {}
      
      const { stockId } = body;
      
      // DÜZELTME: Hesap siparişleri 'orders' koleksiyonunda type: 'account' olarak saklanıyor
      // Önce orders koleksiyonunda ara
      let order = await db.collection('orders').findOne({ id: orderId, type: 'account' });
      
      // Bulunamazsa eski account_orders koleksiyonunda da ara (geriye dönük uyumluluk)
      if (!order) {
        order = await db.collection('account_orders').findOne({ id: orderId });
      }
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // Siparişin hangi koleksiyonda olduğunu belirle
      const orderCollection = order.type === 'account' ? 'orders' : 'account_orders';

      // Check if order already has stock assigned
      if (order.delivery?.credentials || order.credentials) {
        return NextResponse.json(
          { success: false, error: 'Bu siparişe zaten hesap bilgisi atanmış' },
          { status: 400 }
        );
      }

      if (order.status !== 'paid') {
        return NextResponse.json(
          { success: false, error: 'Sadece ödenmiş siparişlere hesap atanabilir' },
          { status: 400 }
        );
      }

      // Build query for stock
      let stockQuery = {
        accountId: order.accountId,
        status: 'available'
      };
      
      // If specific stockId provided, use it
      if (stockId) {
        stockQuery.id = stockId;
      }

      // Try to assign account stock
      const assignedStock = await db.collection('account_stock').findOneAndUpdate(
        stockQuery,
        { 
          $set: { 
            status: 'sold', 
            orderId: order.id,
            soldAt: new Date(),
            soldBy: user.username || user.email
          } 
        },
        { 
          returnDocument: 'after',
          sort: { createdAt: 1 }
        }
      );

      if (assignedStock) {
        let stockItem;
        if (assignedStock._id) {
          stockItem = assignedStock;
        } else if (assignedStock.value && assignedStock.value._id) {
          stockItem = assignedStock.value;
        } else {
          stockItem = assignedStock;
        }
        
        const credentials = stockItem.credentials || stockItem.value;
        
        if (!credentials) {
          console.error('Credentials empty. Stock item:', JSON.stringify(stockItem));
          return NextResponse.json(
            { success: false, error: 'Hesap bilgisi boş - lütfen tekrar deneyin' },
            { status: 400 }
          );
        }
        
        // DÜZELTME: Doğru koleksiyonda güncelle
        await db.collection(orderCollection).updateOne(
          { id: order.id },
          {
            $set: {
              'delivery.credentials': credentials,
              'delivery.status': 'delivered',
              'delivery.message': 'Hesap bilgileri teslim edildi',
              'delivery.stockId': stockItem.id || stockItem._id?.toString(),
              'delivery.deliveredAt': new Date(),
              'delivery.deliveredBy': user.username || user.email,
              status: 'delivered',
              deliveredAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        // Send delivery email
        const orderUser = await db.collection('users').findOne({ id: order.userId });
        const account = await db.collection('accounts').findOne({ id: order.accountId });
        
        if (orderUser && account && orderUser.email) {
          try {
            // Hesap teslimat e-postası gönder
            await sendDeliveredEmail(db, order, orderUser, account, [credentials]);
            console.log('Account delivery email sent to:', orderUser.email);
            // Hesap teslimat SMS'i gönder
            sendAccountDeliverySms(db, order, orderUser, account.title).catch(err =>
              console.error('Account delivery SMS failed:', err)
            );
          } catch (err) {
            console.error('Delivery email failed:', err);
          }
        }

        // Stok sayısını güncelle
        const remainingStock = await db.collection('account_stock').countDocuments({
          accountId: order.accountId,
          status: 'available'
        });
        
        await db.collection('accounts').updateOne(
          { id: order.accountId },
          { $set: { stockCount: remainingStock, updatedAt: new Date() } }
        );

        return NextResponse.json({
          success: true,
          message: 'Hesap stoku başarıyla atandı ve müşteriye e-posta gönderildi',
          data: { 
            orderId: order.id,
            status: 'delivered',
            credentials: credentials
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Bu hesap için mevcut stok bulunamadı' },
          { status: 400 }
        );
      }
    }
    
    // For all other endpoints, parse JSON body (with fallback for empty body)
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Empty body or invalid JSON - use empty object
      body = {};
    }

    // Admin login
    // DEPRECATED: Old admin login - redirect to unified login
    if (pathname === '/api/admin/login') {
      // For backwards compatibility, try to authenticate and return response
      // But new flow should use /api/auth/login
      const { username, password, email } = body;
      
      // If email is provided, use the new flow
      if (email) {
        // Find user by email with admin role
        const user = await db.collection('users').findOne({ 
          email: email.toLowerCase(),
          role: 'admin'
        });
        
        if (!user) {
          return NextResponse.json(
            { success: false, error: 'E-posta veya şifre hatalı' },
            { status: 401 }
          );
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          return NextResponse.json(
            { success: false, error: 'E-posta veya şifre hatalı' },
            { status: 401 }
          );
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: 'admin', type: 'user' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return NextResponse.json({
          success: true,
          data: { 
            token, 
            username: user.email,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: 'admin'
            }
          }
        });
      }
      
      // Legacy username-based login (for backwards compatibility during transition)
      const adminUser = await db.collection('admin_users').findOne({ username });
      if (adminUser) {
        const validPassword = await bcrypt.compare(password, adminUser.passwordHash);
        if (validPassword) {
          // Return token with admin role
          const token = jwt.sign(
            { id: adminUser.id, username: adminUser.username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          return NextResponse.json({
            success: true,
            data: { token, username: adminUser.username }
          });
        }
      }
      
      return NextResponse.json(
        { success: false, error: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    // Admin: Create admin user (internal use - call once to migrate)
    if (pathname === '/api/admin/create-admin-user') {
      const { email, password, firstName, lastName, secretKey } = body;
      
      // Secret key protection for admin creation
      if (secretKey !== 'ADMIN_SETUP_2024') {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz' },
          { status: 403 }
        );
      }
      
      // Check if admin already exists
      const existingAdmin = await db.collection('users').findOne({ role: 'admin' });
      if (existingAdmin) {
        return NextResponse.json(
          { success: false, error: 'Admin kullanıcı zaten mevcut' },
          { status: 400 }
        );
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const adminUser = {
        id: uuidv4(),
        email: email.toLowerCase(),
        firstName: firstName || 'Admin',
        lastName: lastName || 'User',
        phone: '',
        passwordHash: hashedPassword,
        role: 'admin',
        authProvider: 'local',
        emailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('users').insertOne(adminUser);
      
      return NextResponse.json({
        success: true,
        message: 'Admin kullanıcı oluşturuldu',
        data: { email: adminUser.email }
      });
    }

    // Admin: Save email settings
    if (pathname === '/api/admin/email/settings') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { enableEmail, fromName, fromEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, testRecipientEmail } = body;
      
      // Get existing settings to preserve encrypted password if not changed
      const existingSettings = await db.collection('email_settings').findOne({ id: 'main' });
      
      let encryptedPassword = existingSettings?.smtpPass || '';
      
      // Only encrypt if password changed (not masked value)
      if (smtpPass && smtpPass !== '••••••••') {
        encryptedPassword = encrypt(smtpPass);
      }

      await db.collection('email_settings').updateOne(
        { id: 'main' },
        {
          $set: {
            id: 'main',
            enableEmail: enableEmail || false,
            fromName: fromName || '',
            fromEmail: fromEmail || '',
            smtpHost: smtpHost || '',
            smtpPort: smtpPort || '587',
            smtpSecure: smtpSecure || false,
            smtpUser: smtpUser || '',
            smtpPass: encryptedPassword,
            testRecipientEmail: testRecipientEmail || '',
            updatedAt: new Date(),
            updatedBy: user.username
          }
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: 'E-posta ayarları kaydedildi'
      });
    }

    // Admin: Send test email
    if (pathname === '/api/admin/email/test') {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const settings = await getEmailSettings(db);
      
      if (!settings || !settings.enableEmail) {
        return NextResponse.json(
          { success: false, error: 'E-posta gönderimi devre dışı veya yapılandırılmamış' },
          { status: 400 }
        );
      }

      if (!settings.testRecipientEmail) {
        return NextResponse.json(
          { success: false, error: 'Test alıcı e-posta adresi belirtilmemiş' },
          { status: 400 }
        );
      }

      try {
        const transporter = await createTransporter(settings);
        if (!transporter) {
          return NextResponse.json(
            { success: false, error: 'SMTP bağlantısı kurulamadı' },
            { status: 500 }
          );
        }

        // Get site settings for template
        const siteSettings = await db.collection('site_settings').findOne({ id: 'main' });

        const testContent = {
          subject: 'Test E-postasi - PINLY',
          title: 'Test E-postasi Basarili',
          body: `
            <p>Merhaba,</p>
            <p>Bu bir test e-postasdir. E-posta sisteminiz dogru yapilandirilmis ve calisiyor.</p>
          `
        };

        const html = generateEmailTemplate(testContent, {
          logoUrl: siteSettings?.logoUrl,
          siteName: siteSettings?.siteName || 'PINLY'
        });
        
        const text = htmlToPlainText(html);

        await transporter.sendMail({
          from: `"${settings.fromName}" <${settings.fromEmail}>`,
          replyTo: settings.fromEmail,
          to: settings.testRecipientEmail,
          subject: testContent.subject,
          text: text,
          html: html,
          headers: {
            'X-Priority': '3',
            'X-Mailer': 'PINLY Mailer'
          }
        });

        // Log test email
        await db.collection('email_logs').insertOne({
          id: uuidv4(),
          type: 'test',
          userId: 'admin',
          to: settings.testRecipientEmail,
          status: 'sent',
          createdAt: new Date()
        });

        return NextResponse.json({
          success: true,
          message: `Test e-postası ${settings.testRecipientEmail} adresine gönderildi`
        });

      } catch (error) {
        console.error('Test email error:', error.message);
        
        // Log failed attempt
        await db.collection('email_logs').insertOne({
          id: uuidv4(),
          type: 'test',
          userId: 'admin',
          to: settings.testRecipientEmail,
          status: 'failed',
          error: error.message,
          createdAt: new Date()
        });

        return NextResponse.json(
          { success: false, error: `E-posta gönderilemedi: ${error.message}` },
          { status: 500 }
        );
      }
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

      // Send welcome email (async, don't block response)
      sendWelcomeEmail(db, user).catch(err => console.error('Welcome email failed:', err));

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

    // User Login - Unified for both users and admins
    if (pathname === '/api/auth/login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'E-posta ve şifre gereklidir' },
          { status: 400 }
        );
      }

      // Check brute force lockout
      const bruteForceCheck = checkBruteForce(email.toLowerCase(), clientIP, false);
      if (!bruteForceCheck.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Çok fazla başarısız deneme. ${Math.ceil(bruteForceCheck.retryAfter / 60)} dakika sonra tekrar deneyin.`,
            code: 'LOCKOUT'
          },
          { 
            status: 429,
            headers: { 'Retry-After': bruteForceCheck.retryAfter?.toString() || '600' }
          }
        );
      }

      // Find user by email
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!user) {
        // Record failed attempt
        recordFailedLogin(email.toLowerCase(), clientIP, false);
        await logAuditAction(db, AUDIT_ACTIONS.USER_LOGIN_FAILED, null, 'user', null, request, { email, reason: 'user_not_found' });
        return NextResponse.json(
          { success: false, error: 'E-posta veya şifre hatalı' },
          { status: 401 }
        );
      }

      // Check if user has password (might be Google-only user)
      if (!user.passwordHash) {
        return NextResponse.json(
          { success: false, error: 'Bu hesap Google ile oluşturulmuş. Google ile giriş yapın.', code: 'GOOGLE_ONLY' },
          { status: 400 }
        );
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        // Record failed attempt - use admin config if user is admin
        const isAdmin = user.role === 'admin';
        const entry = recordFailedLogin(email.toLowerCase(), clientIP, isAdmin);
        await logAuditAction(db, isAdmin ? AUDIT_ACTIONS.ADMIN_LOGIN_FAILED : AUDIT_ACTIONS.USER_LOGIN_FAILED, user.id, 'user', user.id, request, { 
          email, 
          reason: 'invalid_password',
          attemptCount: entry.attempts
        });
        
        // Show remaining attempts if close to lockout
        const config = isAdmin ? BRUTE_FORCE_CONFIG.admin : BRUTE_FORCE_CONFIG.user;
        const remaining = config.maxAttempts - entry.attempts;
        let errorMsg = 'E-posta veya şifre hatalı';
        if (remaining <= 2 && remaining > 0) {
          errorMsg += `. ${remaining} deneme hakkınız kaldı.`;
        }
        
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 401 }
        );
      }

      // Check if user is banned/inactive
      if (user.isActive === false || user.banned === true) {
        return NextResponse.json(
          { success: false, error: 'Hesabınız askıya alınmış. Destek ile iletişime geçin.', code: 'ACCOUNT_SUSPENDED' },
          { status: 403 }
        );
      }

      // Clear brute force on successful login
      clearBruteForce(email.toLowerCase(), clientIP, user.role === 'admin');

      // Determine user role (default: user)
      const userRole = user.role || 'user';

      // Log successful login
      await logAuditAction(db, userRole === 'admin' ? AUDIT_ACTIONS.ADMIN_LOGIN : AUDIT_ACTIONS.USER_LOGIN, user.id, 'user', user.id, request, { email });

      // Generate JWT token with role included
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          role: userRole,
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
            phone: user.phone,
            role: userRole,
            authProvider: user.authProvider || 'local',
            avatarUrl: user.avatarUrl || null
          }
        }
      });
    }

    // ============================================
    // PASSWORD RESET ENDPOINTS
    // ============================================

    // Forgot Password - Send reset email
    if (pathname === '/api/auth/forgot-password') {
      const { email } = body;

      if (!email) {
        return NextResponse.json(
          { success: false, error: 'E-posta adresi gereklidir' },
          { status: 400 }
        );
      }

      // Find user by email
      const user = await db.collection('users').findOne({ 
        email: email.toLowerCase().trim() 
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return NextResponse.json({
          success: true,
          message: 'Eğer bu e-posta ile kayıtlı bir hesap varsa, şifre sıfırlama linki gönderildi.'
        });
      }

      // Check if user registered with Google (no password)
      if (user.authProvider === 'google' && !user.password) {
        return NextResponse.json({
          success: false,
          error: 'Bu hesap Google ile oluşturulmuş. Lütfen Google ile giriş yapın.',
          code: 'GOOGLE_ACCOUNT'
        });
      }

      // Generate reset token
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to database
      await db.collection('password_resets').insertOne({
        id: uuidv4(),
        userId: user.id,
        email: user.email,
        token: resetToken,
        expiresAt: resetExpires,
        used: false,
        createdAt: new Date()
      });

      // Send reset email
      try {
        await sendPasswordResetEmail(db, user, resetToken);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Eğer bu e-posta ile kayıtlı bir hesap varsa, şifre sıfırlama linki gönderildi.'
      });
    }

    // Reset Password - Validate token and update password
    if (pathname === '/api/auth/reset-password') {
      const { token, password } = body;

      if (!token || !password) {
        return NextResponse.json(
          { success: false, error: 'Token ve yeni şifre gereklidir' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Şifre en az 6 karakter olmalıdır' },
          { status: 400 }
        );
      }

      // Find valid reset token
      const resetRecord = await db.collection('password_resets').findOne({
        token: token,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!resetRecord) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz veya süresi dolmuş link. Lütfen yeni bir şifre sıfırlama talebi oluşturun.' },
          { status: 400 }
        );
      }

      // Find user
      const user = await db.collection('users').findOne({ id: resetRecord.userId });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await db.collection('users').updateOne(
        { id: user.id },
        { 
          $set: { 
            password: hashedPassword,
            updatedAt: new Date()
          } 
        }
      );

      // Mark token as used
      await db.collection('password_resets').updateOne(
        { id: resetRecord.id },
        { 
          $set: { 
            used: true,
            usedAt: new Date()
          } 
        }
      );

      // Send password changed confirmation email
      try {
        await sendPasswordChangedEmail(db, user);
      } catch (emailError) {
        console.error('Failed to send password changed email:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.'
      });
    }

    // ============================================
    // GOOGLE OAUTH ENDPOINTS
    // ============================================

    // Public: Check if Google OAuth is enabled
    if (pathname === '/api/auth/google/status') {
      // Always return enabled=true since we have .env configuration
      return NextResponse.json({
        success: true,
        data: {
          enabled: true
        }
      });
    }

    // Public: Get Site Base URL for OAuth redirect info
    if (pathname === '/api/site/base-url') {
      const siteSettings = await db.collection('site_settings').findOne({ active: true });
      const baseUrl = siteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      return NextResponse.json({
        success: true,
        data: { baseUrl }
      });
    }

    // Google OAuth: Initiate login
    if (pathname === '/api/auth/google') {
      // PRIORITY: Use .env credentials first, then fallback to database
      let clientId, redirectUri;
      
      // Check .env first (hardcoded credentials take priority)
      if (process.env.GOOGLE_CLIENT_ID) {
        clientId = process.env.GOOGLE_CLIENT_ID;
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://pinly.com.tr/api/auth/google/callback';
      } else {
        // Fallback to database
        const oauthSettings = await db.collection('oauth_settings').findOne({ provider: 'google' });
        if (oauthSettings?.clientId) {
          clientId = decrypt(oauthSettings.clientId);
          const host = request.headers.get('host');
          const protoHeader = request.headers.get('x-forwarded-proto') || 'https';
          const protocol = protoHeader.split(',')[0].trim();
          redirectUri = `${protocol}://${host}/api/auth/google/callback`;
        } else {
          return NextResponse.redirect(new URL('/?google_auth=error&reason=oauth_not_configured', request.url));
        }
      }
      
      // Build Google OAuth URL
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', clientId);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('prompt', 'consent');
      
      return NextResponse.redirect(googleAuthUrl.toString());
    }

    // Google OAuth: Callback handler
    if (pathname === '/api/auth/google/callback') {
      const { searchParams } = new URL(request.url);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      // Use hardcoded base URL for pinly.com.tr
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinly.com.tr';
      
      if (error) {
        return NextResponse.redirect(new URL(`/?google_auth=error&reason=google_auth_denied`, baseUrl));
      }
      
      if (!code) {
        return NextResponse.redirect(new URL(`/?google_auth=error&reason=no_code`, baseUrl));
      }
      
      try {
        // PRIORITY: Use .env credentials first
        let clientId, clientSecret, redirectUri;
        
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
          clientId = process.env.GOOGLE_CLIENT_ID;
          clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://pinly.com.tr/api/auth/google/callback';
        } else {
          // Fallback to database
          const oauthSettings = await db.collection('oauth_settings').findOne({ provider: 'google' });
          if (oauthSettings?.clientId && oauthSettings?.clientSecret) {
            clientId = decrypt(oauthSettings.clientId);
            clientSecret = decrypt(oauthSettings.clientSecret);
            redirectUri = `${baseUrl}/api/auth/google/callback`;
          } else {
            return NextResponse.redirect(new URL(`/?google_auth=error&reason=oauth_config_error`, baseUrl));
          }
        }
        
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          console.error('Google OAuth token error:', tokenData);
          return NextResponse.redirect(new URL(`/?google_auth=error&reason=token_error`, baseUrl));
        }
        
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        
        const googleUser = await userInfoResponse.json();
        
        if (!googleUser.email) {
          return NextResponse.redirect(new URL(`/?google_auth=error&reason=no_email`, baseUrl));
        }
        
        // Check if user exists
        let user = await db.collection('users').findOne({ email: googleUser.email });
        
        if (user) {
          // Update existing user with Google info if not already linked
          if (!user.googleId) {
            await db.collection('users').updateOne(
              { id: user.id },
              { 
                $set: { 
                  googleId: googleUser.id,
                  profilePicture: user.profilePicture || googleUser.picture,
                  updatedAt: new Date()
                }
              }
            );
          }
        } else {
          // Create new user
          const userId = uuidv4();
          const nameParts = (googleUser.name || '').split(' ');
          const firstName = nameParts[0] || googleUser.given_name || 'User';
          const lastName = nameParts.slice(1).join(' ') || googleUser.family_name || '';
          
          user = {
            id: userId,
            email: googleUser.email,
            firstName,
            lastName,
            phone: '',
            googleId: googleUser.id,
            profilePicture: googleUser.picture,
            role: 'user',
            status: 'active',
            authMethod: 'google',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await db.collection('users').insertOne(user);
        }
        
        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, email: user.email, type: 'user', role: user.role || 'user' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        // Create response with redirect
        const response = NextResponse.redirect(new URL(`/?google_auth=success`, baseUrl));
        
        // Set cookies for client-side handling
        response.cookies.set('googleAuthToken', token, {
          httpOnly: false,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 5, // 5 minutes - just for transfer
          path: '/'
        });
        
        response.cookies.set('googleAuthUser', Buffer.from(JSON.stringify({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture
        })).toString('base64'), {
          httpOnly: false,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 5,
          path: '/'
        });
        
        return response;
        
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        return NextResponse.redirect(new URL(`/?google_auth=error&reason=oauth_callback_error`, baseUrl));
      }
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

      const { productId, playerId, playerName, paymentMethod, termsAccepted, termsAcceptedAt } = body; // paymentMethod: 'card' or 'balance'
      
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

      // ============================================
      // 💰 BALANCE PAYMENT FLOW
      // ============================================
      if (paymentMethod === 'balance') {
        const userBalance = user.balance || 0;
        const orderAmount = product.discountPrice || product.price || 0;

        // Check sufficient balance
        if (userBalance < orderAmount) {
          return NextResponse.json(
            { success: false, error: `Yetersiz bakiye. Mevcut: ${userBalance.toFixed(2)} ₺, Gerekli: ${orderAmount.toFixed(2)} ₺` },
            { status: 400 }
          );
        }

        // Create customer snapshot
        const customerSnapshot = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone
        };

        // Create order with PAID status (balance payment)
        const order = {
          id: uuidv4(),
          userId: user.id,
          productId,
          productTitle: product.title,
          productImageUrl: product.imageUrl || null,
          playerId,
          playerName,
          customer: customerSnapshot,
          status: 'paid', // Already paid with balance
          paymentMethod: 'balance',
          amount: orderAmount, // Added amount field
          totalAmount: orderAmount,
          currency: 'TRY',
          termsAccepted: termsAccepted || false,
          termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt) : new Date(),
          delivery: {
            status: 'pending',
            message: 'Stok atanıyor...',
            items: []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Deduct balance
        const newBalance = userBalance - orderAmount;
        await db.collection('users').updateOne(
          { id: user.id },
          { $set: { balance: newBalance, updatedAt: new Date() } }
        );

        // Create balance transaction record
        await db.collection('balance_transactions').insertOne({
          id: uuidv4(),
          userId: user.id,
          type: 'order_payment',
          amount: -orderAmount,
          balanceBefore: userBalance,
          balanceAfter: newBalance,
          description: `Sipariş ödemesi: ${product.title}`,
          orderId: order.id,
          createdAt: new Date()
        });

        // Insert order
        await db.collection('orders').insertOne(order);

        // SMS gönder - Bakiye ile ödeme başarılı
        sendPaymentSuccessSms(db, order, user, product.title).catch(err =>
          console.error('Balance payment SMS failed:', err)
        );

        // Check if high-value order (>= 3000 TL) - requires verification
        if (orderAmount >= 3000) {
          await db.collection('orders').updateOne(
            { id: order.id },
            {
              $set: {
                verification: {
                  required: true,
                  status: 'pending',
                  identityPhoto: null,
                  paymentReceipt: null,
                  submittedAt: null,
                  reviewedAt: null,
                  reviewedBy: null,
                  rejectionReason: null
                },
                delivery: {
                  status: 'verification_required',
                  message: 'Yüksek tutarlı sipariş - Kimlik ve ödeme dekontu doğrulaması gerekli',
                  items: []
                }
              }
            }
          );

          sendVerificationRequiredEmail(db, order, user, product).catch(err => 
            console.error('Verification required email failed:', err)
          );

          return NextResponse.json({
            success: true,
            message: 'Sipariş oluşturuldu. Doğrulama gerekli.',
            data: { orderId: order.id, requiresVerification: true }
          });
        }

        // Auto-assign stock for orders < 3000 TL
        const assignedStock = await db.collection('stock').findOneAndUpdate(
          { productId, status: 'available' },
          { 
            $set: { 
              status: 'assigned',
              orderId: order.id,
              assignedAt: new Date()
            }
          },
          { 
            returnDocument: 'after',
            sort: { createdAt: 1 }
          }
        );

        if (assignedStock && assignedStock.value) {
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

          // Send delivered email
          sendDeliveredEmail(db, order, user, product, [stockCode]).catch(err => 
            console.error('Delivered email failed:', err)
          );

          await logAuditAction(db, AUDIT_ACTIONS.ORDER_COMPLETE, user.id, 'order', order.id, request, {
            paymentMethod: 'balance',
            stockAssigned: true
          });

          return NextResponse.json({
            success: true,
            message: 'Sipariş tamamlandı',
            data: { orderId: order.id }
          });
        } else {
          // No stock available
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

          await logAuditAction(db, AUDIT_ACTIONS.ORDER_CREATE, user.id, 'order', order.id, request, {
            paymentMethod: 'balance',
            stockAssigned: false
          });

          return NextResponse.json({
            success: true,
            message: 'Sipariş oluşturuldu. Stok bekleniyor.',
            data: { orderId: order.id }
          });
        }
      }

      // ============================================
      // 💳 CARD PAYMENT FLOW (SHOPIER)
      // ============================================

      // Get Shopier settings from database
      const shopierSettings = await db.collection('shopier_settings').findOne({ isActive: true });
      
      if (!shopierSettings) {
        return NextResponse.json(
          { success: false, error: 'Ödeme sistemi yapılandırılmamış. Lütfen yöneticiyle iletişime geçin.' },
          { status: 503 }
        );
      }

      // Decrypt Shopier credentials (only apiKey and apiSecret needed)
      let apiKey, apiSecret;
      try {
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
      // Try all possible price fields
      const orderAmount = product.discountPrice || product.price || product.finalPrice || product.salePrice || product.currentPrice || product.sellingPrice || 0;
      
      console.log('========================================');
      console.log('📦 ORDER CREATION - PRICE CHECK');
      console.log('Product ID:', product.id);
      console.log('Product Title:', product.title);
      console.log('product.discountPrice:', product.discountPrice);
      console.log('product.price:', product.price);
      console.log('product.finalPrice:', product.finalPrice);
      console.log('product.salePrice:', product.salePrice);
      console.log('product.currentPrice:', product.currentPrice);
      console.log('product.sellingPrice:', product.sellingPrice);
      console.log('FINAL orderAmount:', orderAmount);
      console.log('========================================');
      
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
        amount: orderAmount, // Backend-controlled price
        totalAmount: orderAmount, // For verification checks
        currency: 'TRY',
        termsAccepted: termsAccepted || false,
        termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('orders').insertOne(order);

      // Send order created email (async, don't block response)
      sendOrderCreatedEmail(db, order, user, product).catch(err => 
        console.error('Order created email failed:', err)
      );

      // Generate random number for Shopier request (6 digits as per API spec)
      const randomNr = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
      const crypto = require('crypto');

      // Currency codes: 0 = TRY, 1 = USD, 2 = EUR
      const currencyCode = 0; // TRY

      // Prepare Shopier payment request with REAL customer data
      // Field names MUST match exactly what Shopier expects
      // E-posta adresi maskeleniyor - Shopier'den müşteriye mail gitmesin
      const maskedEmail = maskEmailForShopier(customerSnapshot.email);
      const shopierPayload = {
        API_key: apiKey, // Note: API_key not api_key
        website_index: 1,
        platform_order_id: order.id,
        product_name: 'Bakiye Yüklemesi',
        product_type: 1, // 0 = Physical, 1 = Digital
        buyer_name: customerSnapshot.firstName,
        buyer_surname: customerSnapshot.lastName,
        buyer_email: maskedEmail, // Maskelenmiş e-posta
        buyer_account_age: 0,
        buyer_id_nr: playerId,
        buyer_phone: customerSnapshot.phone,
        billing_address: 'Turkey',
        billing_city: 'Istanbul',
        billing_country: 'Turkey',
        billing_postcode: '34000',
        shipping_address: 'Turkey',
        shipping_city: 'Istanbul',
        shipping_country: 'Turkey',
        shipping_postcode: '34000',
        total_order_value: order.amount,
        currency: currencyCode,
        platform: 0, // 0 = in frame
        is_in_frame: 0,
        current_language: 0, // 0 = TR, 1 = EN
        modul_version: '1.0.4',
        random_nr: randomNr,
      };

      // Generate Shopier signature using CORRECT method:
      // data = random_nr + platform_order_id + total_order_value + currency
      // signature = HMAC-SHA256(data, apiSecret).digest('base64')
      const signatureData = `${randomNr}${order.id}${order.amount}${currencyCode}`;
      const signature = crypto.createHmac('sha256', apiSecret)
        .update(signatureData)
        .digest('base64');

      // Add signature to payload
      shopierPayload.signature = signature;

      // Shopier payment endpoint
      const paymentUrl = 'https://www.shopier.com/ShowProduct/api_pay4.php';

      // Store payment request in database for audit trail
      await db.collection('payment_requests').insertOne({
        orderId: order.id,
        shopierPayload: { ...shopierPayload, API_key: '***MASKED***', signature: '***MASKED***' },
        signatureData: `${randomNr}${order.id}***MASKED***`,
        createdAt: new Date()
      });

      // Return all form fields for frontend to build the form
      return NextResponse.json({
        success: true,
        data: {
          order,
          paymentUrl,
          formData: shopierPayload
        }
      });
    }

    // Shopier callback (Production-ready with security)
    if (pathname === '/api/payments/shopier/callback') {
      const { status, payment_id, random_nr, platform_order_id, signature, installment } = body;
      
      // Get order ID from callback
      const orderId = platform_order_id;
      
      // 1. Validate order exists
      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) {
        console.error(`Callback error: Order ${orderId} not found`);
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

      // 3. Get Shopier settings for signature validation
      const shopierSettings = await db.collection('shopier_settings').findOne({ isActive: true });
      if (!shopierSettings) {
        console.error('Callback error: Shopier settings not found');
        return NextResponse.json(
          { success: false, error: 'Ödeme sistemi yapılandırılmamış' },
          { status: 500 }
        );
      }

      // 4. Decrypt API secret for signature validation
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

      // 5. Validate signature (CRITICAL SECURITY)
      // Shopier signature: HMAC-SHA256(random_nr + platform_order_id, apiSecret).digest('base64')
      const expectedSignature = generateShopierHash(random_nr, orderId, apiSecret);
      if (signature !== expectedSignature) {
        console.error(`Callback error: Signature mismatch. Expected: ${expectedSignature}, Received: ${signature}`);
        // Log the failed attempt for security monitoring
        await db.collection('payment_security_logs').insertOne({
          orderId: order.id,
          event: 'signature_mismatch',
          receivedSignature: signature,
          expectedSignature: '***MASKED***',
          payload: { ...body, signature: '***MASKED***' },
          timestamp: new Date()
        });
        
        return NextResponse.json(
          { success: false, error: 'Geçersiz imza' },
          { status: 403 }
        );
      }

      // 6. Check payment_id uniqueness (double payment protection)
      if (payment_id) {
        const existingPayment = await db.collection('payments').findOne({ providerTxnId: payment_id.toString() });
        if (existingPayment) {
          console.error(`Callback error: Payment ${payment_id} already exists`);
          return NextResponse.json({
            success: true,
            message: 'İşlem zaten kaydedilmiş'
          });
        }
      }

      // 7. Map Shopier status to application status
      // Shopier returns "success" for successful payments
      let newStatus;
      if (status === 'success') {
        newStatus = 'paid';
      } else {
        newStatus = 'failed';
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
        providerTxnId: payment_id ? payment_id.toString() : uuidv4(),
        status: newStatus,
        amount: order.amount,
        currency: order.currency,
        installment: installment || 0,
        signatureValidated: true,
        rawPayload: { ...body, signature: '***MASKED***' },
        verifiedAt: new Date(),
        createdAt: new Date()
      });

      // 11. PROCESS PAID ORDERS
      if (newStatus === 'paid') {
        // Get user and product for email
        const orderUser = await db.collection('users').findOne({ id: order.userId });
        const product = await db.collection('products').findOne({ id: order.productId });
        
        // Hesap siparişleri için account bilgisini al
        const account = order.accountId ? await db.collection('accounts').findOne({ id: order.accountId }) : null;
        
        // ============================================
        // 🚀 HEMEN SMS GÖNDER - EN BAŞTA!
        // ============================================
        const itemTitle = product?.title || account?.title || order.productTitle || order.accountTitle || 'Sipariş';
        if (orderUser && orderUser.phone) {
          console.log('🚀 IMMEDIATE SMS: Sending to', orderUser.phone, 'for', itemTitle);
          sendPaymentSuccessSms(db, order, orderUser, itemTitle).catch(err =>
            console.error('🚀 IMMEDIATE SMS FAILED:', err)
          );
        } else {
          console.log('🚀 IMMEDIATE SMS SKIPPED: No user or phone', { hasUser: !!orderUser, hasPhone: !!orderUser?.phone });
        }
        // ============================================
        
        // Log for debugging
        console.log('========================================');
        console.log('📧 SMS/EMAIL DEBUG');
        console.log('Order ID:', order.id);
        console.log('Order Type:', order.type);
        console.log('User found:', !!orderUser);
        console.log('User phone:', orderUser?.phone);
        console.log('Product found:', !!product);
        console.log('Account found:', !!account);
        console.log('========================================');

        // ============================================
        // 🔐 HIGH-VALUE ORDER CHECK - DO THIS FIRST!
        // ============================================
        // Get the order amount from multiple sources - try ALL possible price fields
        const productPrice = product ? (product.discountPrice || product.price || product.finalPrice || product.salePrice || product.currentPrice || product.sellingPrice || 0) : 0;
        const orderAmount = order.amount || order.totalAmount || productPrice || 0;
        
        console.log('========================================');
        console.log('🔐 HIGH-VALUE ORDER CHECK');
        console.log('Order ID:', order.id);
        console.log('order.amount:', order.amount);
        console.log('order.totalAmount:', order.totalAmount);
        console.log('product.discountPrice:', product?.discountPrice);
        console.log('product.price:', product?.price);
        console.log('product.finalPrice:', product?.finalPrice);
        console.log('product.salePrice:', product?.salePrice);
        console.log('FINAL orderAmount:', orderAmount);
        console.log('Is >= 3000?', orderAmount >= 3000);
        console.log('========================================');

        if (orderAmount >= 3000) {
          // HIGH VALUE ORDER - REQUIRES VERIFICATION
          await db.collection('orders').updateOne(
            { id: order.id },
            {
              $set: {
                amount: orderAmount,
                totalAmount: orderAmount,
                verification: {
                  required: true,
                  status: 'pending',
                  identityPhoto: null,
                  paymentReceipt: null,
                  submittedAt: null,
                  reviewedAt: null,
                  reviewedBy: null,
                  rejectionReason: null
                },
                delivery: {
                  status: 'verification_required',
                  message: 'Yüksek tutarlı sipariş - Kimlik ve ödeme dekontu doğrulaması gerekli',
                  items: []
                }
              }
            }
          );
          
          console.log(`✅ Order ${order.id} marked for VERIFICATION (${orderAmount} TL >= 3000 TL)`);
          
          // Send verification required email
          if (orderUser && product) {
            sendVerificationRequiredEmail(db, order, orderUser, product).catch(err => 
              console.error('Verification required email failed:', err)
            );
          }
          
          // Return early - no stock assignment or risk check needed
          return NextResponse.json({
            success: true,
            message: 'Ödeme başarılı - Doğrulama gerekli'
          });
        }

        // ============================================
        // NORMAL FLOW - Orders < 3000 TL
        // ============================================
        
        // Calculate risk score
        const riskResult = await calculateOrderRisk(db, order, orderUser, request);
        
        // Update order with risk information
        await db.collection('orders').updateOne(
          { id: order.id },
          {
            $set: {
              risk: riskResult,
              'meta.ip': getClientIP(request),
              'meta.userAgent': request.headers.get('user-agent')?.substring(0, 500) || ''
            }
          }
        );

        // Get risk settings for behavior control
        let riskSettings = await db.collection('risk_settings').findOne({ id: 'main' });
        if (!riskSettings) {
          riskSettings = DEFAULT_RISK_SETTINGS;
        }

        // Determine delivery behavior based on risk status
        const actualStatus = riskResult.actualStatus || riskResult.status;
        const shouldHoldDelivery = 
          actualStatus === 'FLAGGED' || 
          actualStatus === 'BLOCKED' ||
          (actualStatus === 'SUSPICIOUS' && !riskSettings.suspiciousAutoApprove);

        // If FLAGGED/BLOCKED/SUSPICIOUS - HOLD delivery, don't assign stock
        // Note: High-value orders (>= 3000 TL) are already handled above and won't reach here
        if (shouldHoldDelivery && !riskSettings.isTestMode) {
          // Normal risky order - hold for review
          await db.collection('orders').updateOne(
            { id: order.id },
            {
              $set: {
                delivery: {
                  status: 'hold',
                  message: actualStatus === 'BLOCKED' ? 'Sipariş engellendi' : 
                           actualStatus === 'FLAGGED' ? 'Sipariş kontrol altında - Riskli' :
                           'Sipariş kontrol altında - Şüpheli',
                  holdReason: actualStatus === 'BLOCKED' ? 'risk_blocked' : 
                              actualStatus === 'FLAGGED' ? 'risk_flagged' : 'risk_suspicious',
                  items: []
                }
              }
            }
          );
          
          // Log the risk flag
          await logAuditAction(db, AUDIT_ACTIONS.ORDER_RISK_FLAG, 'system', 'order', order.id, request, {
            riskScore: riskResult.score,
            riskStatus: actualStatus,
            reasons: riskResult.reasons
          });
          
          console.log(`Order ${order.id} ${actualStatus} with risk score ${riskResult.score}. Delivery on HOLD.`);
          
          // Send payment success email (but note delivery is pending review)
          if (orderUser && (product || account)) {
            const itemTitle = product?.title || account?.title || 'Sipariş';
            
            if (product) {
              sendPaymentSuccessEmail(db, order, orderUser, product).catch(err => 
                console.error('Payment success email failed:', err)
              );
            }
            // SMS gönder - Ödeme başarılı
            console.log('📱 Sending payment SMS to:', orderUser.phone, 'for:', itemTitle);
            sendPaymentSuccessSms(db, order, orderUser, itemTitle).catch(err =>
              console.error('Payment success SMS failed:', err)
            );
          } else {
            console.log('⚠️ Cannot send SMS - orderUser:', !!orderUser, 'product:', !!product, 'account:', !!account);
          }
        } else {
          // CLEAR risk (or test mode) - proceed with stock assignment
          // Send payment success email
          if (orderUser && (product || account)) {
            const itemTitle = product?.title || account?.title || 'Sipariş';
            
            if (product) {
              sendPaymentSuccessEmail(db, order, orderUser, product).catch(err => 
                console.error('Payment success email failed:', err)
              );
            }
            // SMS gönder - Ödeme başarılı
            console.log('📱 Sending payment SMS to:', orderUser.phone, 'for:', itemTitle);
            sendPaymentSuccessSms(db, order, orderUser, itemTitle).catch(err =>
              console.error('Payment success SMS failed:', err)
            );
          } else {
            console.log('⚠️ Cannot send SMS - orderUser:', !!orderUser, 'product:', !!product, 'account:', !!account);
          }

          // Check if stock already assigned (idempotency)
          const currentOrder = await db.collection('orders').findOne({ id: order.id });
          
          if (!currentOrder.delivery || !currentOrder.delivery.items || currentOrder.delivery.items.length === 0) {
            // NORMAL FLOW: Auto-assign stock for orders < 3000 TL
            // (Orders >= 3000 TL are already handled at the beginning)
            console.log('Stock assignment starting for order:', order.id);
            
            try {
              // ============================================
              // CHECK IF THIS IS AN ACCOUNT ORDER
              // ============================================
              if (order.type === 'account' && order.accountId) {
                // ACCOUNT ORDER - Use account_stock collection
                console.log('Account order detected, using account_stock collection');
                
                const assignedAccountStock = await db.collection('account_stock').findOneAndUpdate(
                  { 
                    accountId: order.accountId, 
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
                    sort: { createdAt: 1 } // FIFO
                  }
                );

                console.log('Account stock assignment result:', JSON.stringify(assignedAccountStock));

                // findOneAndUpdate bazen value içinde döndürüyor
                let stockItem = null;
                if (assignedAccountStock) {
                  if (assignedAccountStock.value) {
                    stockItem = assignedAccountStock.value;
                  } else if (assignedAccountStock._id || assignedAccountStock.id) {
                    stockItem = assignedAccountStock;
                  }
                }

                if (stockItem && stockItem.credentials) {
                  const credentials = stockItem.credentials;
                  
                  await db.collection('orders').updateOne(
                    { id: order.id },
                    {
                      $set: {
                        delivery: {
                          status: 'delivered',
                          message: 'Hesap bilgileri hazır',
                          credentials: credentials,
                          stockId: stockItem.id || stockItem._id,
                          assignedAt: new Date()
                        },
                        status: 'delivered',
                        deliveredAt: new Date()
                      }
                    }
                  );
                  console.log(`Account stock assigned: Order ${order.id} received credentials`);
                  
                  // Müşteriye e-posta gönder
                  const orderUser = await db.collection('users').findOne({ id: order.userId });
                  const account = await db.collection('accounts').findOne({ id: order.accountId });
                  if (orderUser && account && orderUser.email) {
                    try {
                      await sendDeliveredEmail(db, order, orderUser, account, [credentials]);
                      console.log('Account delivery email sent to:', orderUser.email);
                    } catch (emailErr) {
                      console.error('Account delivery email failed:', emailErr);
                    }
                  }
                  
                  // Update account stock count
                  const accountForUpdate = await db.collection('accounts').findOne({ id: order.accountId });
                  if (accountForUpdate) {
                    const remainingStock = await db.collection('account_stock').countDocuments({
                      accountId: order.accountId,
                      status: 'available'
                    });
                    
                    const updateData = { stockCount: remainingStock };
                    
                    // If not unlimited and no more stock, mark as sold
                    if (!accountForUpdate.unlimited && remainingStock === 0) {
                      updateData.status = 'sold';
                      updateData.soldAt = new Date();
                    }
                    
                    // Increment sales count
                    await db.collection('accounts').updateOne(
                      { id: order.accountId },
                      { 
                        $set: updateData,
                        $inc: { salesCount: 1 }
                      }
                    );
                  }
                } else {
                  // No stock available - check for default credentials
                  const account = await db.collection('accounts').findOne({ id: order.accountId });
                  if (account && account.credentials) {
                    await db.collection('orders').updateOne(
                      { id: order.id },
                      {
                        $set: {
                          delivery: {
                            status: 'delivered',
                            message: 'Hesap bilgileri hazır',
                            credentials: account.credentials,
                            assignedAt: new Date()
                          },
                          status: 'delivered',
                          deliveredAt: new Date()
                        }
                      }
                    );
                    console.log(`Default credentials assigned to order ${order.id}`);
                    
                    // Müşteriye e-posta gönder
                    const orderUser = await db.collection('users').findOne({ id: order.userId });
                    if (orderUser && orderUser.email) {
                      try {
                        await sendDeliveredEmail(db, order, orderUser, account, [account.credentials]);
                        console.log('Default credentials delivery email sent to:', orderUser.email);
                      } catch (emailErr) {
                        console.error('Default credentials delivery email failed:', emailErr);
                      }
                    }
                  } else {
                    await db.collection('orders').updateOne(
                      { id: order.id },
                      {
                        $set: {
                          delivery: {
                            status: 'pending',
                            message: 'Stok bekleniyor - Admin tarafından atanacak',
                            items: []
                          }
                        }
                      }
                    );
                    console.log(`No stock available for account order ${order.id}`);
                  }
                }
                
                // Return success for account orders
                return NextResponse.json({
                  success: true,
                  message: 'Ödeme başarılı'
                });
              }

              // ============================================
              // UC ORDER - Use stock collection (original logic)
              // ============================================
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
                
                // Send delivered email with codes
                if (orderUser && product) {
                  sendDeliveredEmail(db, order, orderUser, product, [stockCode]).catch(err => 
                    console.error('Delivered email failed:', err)
                  );
                  // UC teslimat SMS'i gönder
                  sendDeliverySms(db, order, orderUser, product.title).catch(err =>
                    console.error('Delivery SMS failed:', err)
                  );
                }
              } else {
                // No stock available - try DijiPin auto-delivery if enabled
                const dijipinSettings = await db.collection('settings').findOne({ type: 'dijipin' });
                const isDijipinGlobalEnabled = dijipinSettings?.isEnabled && DIJIPIN_API_TOKEN;
                
                // Check if product has DijiPin enabled (product-level setting)
                const isProductDijipinEnabled = product && product.dijipinEnabled === true;
                
                // DijiPin works if: global setting is ON AND product-level setting is ON
                const canUseDijipin = isDijipinGlobalEnabled && isProductDijipinEnabled && order.playerId;
                
                if (canUseDijipin) {
                  console.log(`Attempting DijiPin delivery for order ${order.id}, Product: ${product.title}, PUBG ID: ${order.playerId}`);
                  
                  const dijipinResult = await createDijipinOrder(product.title, 1, order.playerId);
                  
                  if (dijipinResult.success) {
                    // DijiPin order successful
                    await db.collection('orders').updateOne(
                      { id: order.id },
                      {
                        $set: {
                          delivery: {
                            status: 'delivered',
                            method: 'dijipin_auto',
                            dijipinOrderId: dijipinResult.orderId,
                            message: 'UC DijiPin üzerinden gönderildi',
                            items: [`DijiPin Order: ${dijipinResult.orderId}`],
                            deliveredAt: new Date()
                          }
                        }
                      }
                    );
                    console.log(`DijiPin delivery success: Order ${order.id}, DijiPin Order: ${dijipinResult.orderId}`);
                    
                    // Send delivered email
                    if (orderUser && product) {
                      sendDeliveredEmail(db, order, orderUser, product, [`UC başarıyla hesabınıza yüklendi (PUBG ID: ${order.playerId})`]).catch(err => 
                        console.error('Delivered email failed:', err)
                      );
                      // DijiPin teslimat SMS'i gönder
                      sendDeliverySms(db, order, orderUser, product.title).catch(err =>
                        console.error('DijiPin delivery SMS failed:', err)
                      );
                    }
                  } else {
                    // DijiPin failed - mark as pending for manual review
                    await db.collection('orders').updateOne(
                      { id: order.id },
                      {
                        $set: {
                          delivery: {
                            status: 'pending',
                            message: `DijiPin hatası: ${dijipinResult.error}`,
                            dijipinError: dijipinResult.error,
                            items: []
                          }
                        }
                      }
                    );
                    console.error(`DijiPin delivery failed for order ${order.id}:`, dijipinResult.error);
                    
                    // Send pending stock email
                    if (orderUser && product) {
                      sendPendingStockEmail(db, order, orderUser, product, 'Sipariş işleniyor, kısa sürede tamamlanacak').catch(err => 
                        console.error('Pending stock email failed:', err)
                      );
                    }
                  }
                } else {
                  // No stock available and DijiPin not enabled - mark as pending
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
                  
                  // Send pending stock email
                  if (orderUser && product) {
                    sendPendingStockEmail(db, order, orderUser, product, 'Stok bekleniyor').catch(err => 
                      console.error('Pending stock email failed:', err)
                    );
                  }
                }
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
      }

      // 12. Log successful callback for audit
      console.log(`Callback success: Order ${order.id} status updated to ${newStatus}`);

      // 13. SON KONTROL - SMS gönderilmemişse burada gönder
      if (newStatus === 'paid') {
        const finalOrderUser = await db.collection('users').findOne({ id: order.userId });
        const finalProduct = order.productId ? await db.collection('products').findOne({ id: order.productId }) : null;
        const finalAccount = order.accountId ? await db.collection('accounts').findOne({ id: order.accountId }) : null;
        
        // SMS gönderilip gönderilmediğini kontrol et
        const recentSmsLog = await db.collection('sms_logs').findOne({
          orderId: order.id,
          type: 'payment_success',
          createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Son 5 dakika
        });
        
        if (!recentSmsLog && finalOrderUser && finalOrderUser.phone) {
          const itemTitle = finalProduct?.title || finalAccount?.title || 'Sipariş';
          console.log('📱 FALLBACK: Sending payment SMS to:', finalOrderUser.phone);
          sendPaymentSuccessSms(db, order, finalOrderUser, itemTitle).catch(err =>
            console.error('Fallback payment SMS failed:', err)
          );
        }
      }

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

      // Ensure game field defaults to 'pubg' if not provided
      const game = body.game || 'pubg';
      
      const product = {
        id: uuidv4(),
        ...body,
        game,
        createdAt: new Date()
      };

      await db.collection('products').insertOne(product);
      
      // Clear cache for this game
      clearCache(`products_active_${game}`);
      clearCache('products_active');
      
      return NextResponse.json({
        success: true,
        data: product
      });
    }

    // Admin: Create PUBG Account
    if (pathname === '/api/admin/accounts') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { title, description, price, discountPrice, imageUrl, legendaryMin, legendaryMax, level, rank, features, credentials, unlimited, order } = body;

      if (!title || !price) {
        return NextResponse.json(
          { success: false, error: 'Başlık ve fiyat zorunludur' },
          { status: 400 }
        );
      }

      // Calculate discount percent
      let discountPercent = 0;
      if (discountPrice && discountPrice < price) {
        discountPercent = Math.round(((price - discountPrice) / price) * 100);
      }

      const account = {
        id: uuidv4(),
        title,
        description: description || '',
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : parseFloat(price),
        discountPercent,
        imageUrl: imageUrl || '',
        legendaryMin: legendaryMin || 0,
        legendaryMax: legendaryMax || 0,
        level: level || 0,
        rank: rank || '',
        features: features || [],
        credentials: credentials || '', // Hesap bilgileri (gizli - sadece admin görür)
        unlimited: unlimited !== false, // Varsayılan: true (sınırsız satış)
        order: order !== undefined ? parseInt(order) : 0, // Sıralama
        salesCount: 0,
        status: 'available', // available, reserved, sold
        active: true,
        sortOrder: 0,
        createdAt: new Date(),
        createdBy: user.username
      };

      await db.collection('accounts').insertOne(account);
      
      return NextResponse.json({
        success: true,
        message: 'Hesap oluşturuldu',
        data: account
      });
    }

    // Admin: Fix missing order values (migration - one-time use)
    if (pathname === '/api/admin/accounts/fix-order') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      // Update all accounts without order field
      const result = await db.collection('accounts').updateMany(
        { $or: [{ order: { $exists: false } }, { order: null }] },
        { $set: { order: 0 } }
      );

      return NextResponse.json({
        success: true,
        message: `${result.modifiedCount} hesap güncellendi`,
        data: { modifiedCount: result.modifiedCount }
      });
    }

    // Admin: Add stock to account
    if (pathname.match(/^\/api\/admin\/accounts\/[^\/]+\/stock$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const accountId = pathname.split('/')[4];
      const { items } = body; // Array of strings (credentials)

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Hesap bilgileri gereklidir' },
          { status: 400 }
        );
      }

      // Validate account exists
      const account = await db.collection('accounts').findOne({ id: accountId });
      if (!account) {
        return NextResponse.json(
          { success: false, error: 'Hesap bulunamadı' },
          { status: 404 }
        );
      }

      // Create stock items
      const stockItems = items.map(item => ({
        id: uuidv4(),
        accountId,
        credentials: item.trim(), // Hesap bilgileri (email, şifre vs)
        status: 'available',
        orderId: null,
        assignedAt: null,
        createdAt: new Date(),
        createdBy: user.username
      }));

      await db.collection('account_stock').insertMany(stockItems);

      // Update account stock count
      const availableCount = await db.collection('account_stock').countDocuments({ 
        accountId, 
        status: 'available' 
      });
      
      await db.collection('accounts').updateOne(
        { id: accountId },
        { $set: { stockCount: availableCount } }
      );

      return NextResponse.json({
        success: true,
        message: `${stockItems.length} adet hesap bilgisi eklendi`,
        data: {
          count: stockItems.length
        }
      });
    }

    // Admin: Update product DijiPin setting
    if (pathname === '/api/admin/products/dijipin') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const { productId, dijipinEnabled } = body;

      if (!productId) {
        return NextResponse.json({ success: false, error: 'Ürün ID gerekli' }, { status: 400 });
      }

      const result = await db.collection('products').updateOne(
        { id: productId },
        { $set: { dijipinEnabled: dijipinEnabled, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: 'Ürün bulunamadı' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: dijipinEnabled ? 'DijiPin otomatik gönderim açıldı' : 'DijiPin otomatik gönderim kapatıldı'
      });
    }

    // Admin: Create TEST order (free - for testing DijiPin)
    if (pathname === '/api/admin/test-order') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const { productId, playerId } = body;

      if (!productId || !playerId) {
        return NextResponse.json({ success: false, error: 'Ürün ID ve PUBG ID gerekli' }, { status: 400 });
      }

      // Get product
      const product = await db.collection('products').findOne({ id: productId });
      if (!product) {
        return NextResponse.json({ success: false, error: 'Ürün bulunamadı' }, { status: 404 });
      }

      // Create test order
      const testOrder = {
        id: uuidv4(),
        productId: product.id,
        productTitle: product.title,
        quantity: 1,
        totalPrice: 0, // Free test order
        playerId: playerId,
        status: 'paid', // Mark as paid directly
        paymentMethod: 'admin_test',
        isTestOrder: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('orders').insertOne(testOrder);
      console.log(`Admin test order created: ${testOrder.id}, Product: ${product.title}, PUBG ID: ${playerId}`);

      // Check if DijiPin is enabled for this product
      const dijipinSettings = await db.collection('settings').findOne({ type: 'dijipin' });
      const isDijipinGlobalEnabled = dijipinSettings?.isEnabled && DIJIPIN_API_TOKEN;
      const isProductDijipinEnabled = product.dijipinEnabled === true;

      let deliveryResult = { method: 'none', status: 'pending', message: '' };

      if (isDijipinGlobalEnabled && isProductDijipinEnabled) {
        console.log(`Attempting DijiPin delivery for test order ${testOrder.id}`);
        
        const dijipinResult = await createDijipinOrder(product.title, 1, playerId);
        
        if (dijipinResult.success) {
          deliveryResult = {
            method: 'dijipin_auto',
            status: 'delivered',
            dijipinOrderId: dijipinResult.orderId,
            message: 'UC DijiPin üzerinden gönderildi',
            deliveredAt: new Date()
          };
          console.log(`DijiPin delivery success: Test Order ${testOrder.id}, DijiPin Order: ${dijipinResult.orderId}`);
        } else {
          deliveryResult = {
            method: 'dijipin_auto',
            status: 'failed',
            error: dijipinResult.error,
            message: `DijiPin hatası: ${dijipinResult.error}`
          };
          console.error(`DijiPin delivery failed for test order ${testOrder.id}:`, dijipinResult.error);
        }
      } else {
        deliveryResult = {
          method: 'none',
          status: 'pending',
          message: isDijipinGlobalEnabled ? 'Ürün için DijiPin kapalı' : 'DijiPin global ayar kapalı'
        };
      }

      // Update order with delivery result
      await db.collection('orders').updateOne(
        { id: testOrder.id },
        { $set: { delivery: deliveryResult } }
      );

      return NextResponse.json({
        success: true,
        message: 'Test siparişi oluşturuldu',
        data: {
          orderId: testOrder.id,
          product: product.title,
          playerId: playerId,
          delivery: deliveryResult
        }
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

      const { apiKey, apiSecret, mode } = body;

      // Validate required fields (Shopier only needs apiKey and apiSecret)
      if (!apiKey || !apiSecret) {
        return NextResponse.json(
          { success: false, error: 'API Kullanıcı ve API Şifre gereklidir' },
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

      // Encrypt sensitive data before storing (Shopier only needs apiKey and apiSecret)
      const encryptedSettings = {
        apiKey: encrypt(apiKey),
        apiSecret: encrypt(apiSecret),
        mode: mode || 'production',
        isActive: true,
        updatedBy: user.username || user.email,
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

    // Admin: Save SEO Settings (POST)
    if (pathname === '/api/admin/settings/seo') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { ga4MeasurementId, gscVerificationCode, enableAnalytics, enableSearchConsole } = body;

      // Validate GA4 Measurement ID format if provided
      if (ga4MeasurementId && !ga4MeasurementId.match(/^G-[A-Z0-9]+$/)) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz GA4 Measurement ID formatı (G-XXXXXXXXXX)' },
          { status: 400 }
        );
      }

      const seoSettings = {
        ga4MeasurementId: ga4MeasurementId?.trim() || '',
        gscVerificationCode: gscVerificationCode?.trim() || '',
        enableAnalytics: enableAnalytics !== false,
        enableSearchConsole: enableSearchConsole !== false,
        active: true,
        updatedBy: user.username || user.email,
        updatedAt: new Date()
      };

      // Upsert SEO settings
      await db.collection('seo_settings').updateOne(
        { active: true },
        { $set: seoSettings },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: 'SEO ayarları başarıyla kaydedildi',
        data: seoSettings
      });
    }

    // Admin: Manual approve risky order (POST)
    if (pathname.match(/^\/api\/admin\/orders\/[^\/]+\/approve$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const orderId = pathname.split('/')[4];
      const order = await db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // Check if order is on hold
      if (order.delivery?.status !== 'hold') {
        return NextResponse.json(
          { success: false, error: 'Bu sipariş onay beklemede değil' },
          { status: 400 }
        );
      }

      // Get user and product for email
      const orderUser = await db.collection('users').findOne({ id: order.userId });
      const product = await db.collection('products').findOne({ id: order.productId });

      // Assign stock (FIFO)
      const assignedStock = await db.collection('stock').findOneAndUpdate(
        { productId: order.productId, status: 'available' },
        { 
          $set: { 
            status: 'assigned', 
            orderId: order.id,
            assignedAt: new Date()
          } 
        },
        { 
          returnDocument: 'after',
          sort: { createdAt: 1 }
        }
      );

      if (assignedStock && assignedStock.value) {
        const stockCode = assignedStock.value;
        
        // Update order
        await db.collection('orders').updateOne(
          { id: order.id },
          {
            $set: {
              delivery: {
                status: 'delivered',
                items: [stockCode],
                stockId: assignedStock.id || assignedStock._id,
                assignedAt: new Date(),
                approvedBy: user.username || user.email,
                approvedAt: new Date()
              }
            }
          }
        );

        // Log the approval
        await logAuditAction(db, AUDIT_ACTIONS.ORDER_MANUAL_APPROVE, user.id || user.username, 'order', order.id, request, {
          previousRiskScore: order.risk?.score,
          stockCode: '***MASKED***'
        });

        // Send delivered email
        if (orderUser && product) {
          sendDeliveredEmail(db, order, orderUser, product, [stockCode]).catch(err => 
            console.error('Delivered email failed:', err)
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Sipariş onaylandı ve stok atandı',
          data: { 
            orderId: order.id,
            deliveryStatus: 'delivered'
          }
        });
      } else {
        // No stock available
        await db.collection('orders').updateOne(
          { id: order.id },
          {
            $set: {
              delivery: {
                status: 'pending',
                message: 'Stok bekleniyor - Manuel onaylandı',
                items: [],
                approvedBy: user.username || user.email,
                approvedAt: new Date()
              }
            }
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Sipariş onaylandı ancak stok mevcut değil',
          data: { 
            orderId: order.id,
            deliveryStatus: 'pending'
          }
        });
      }
    }

    // Admin: Manual refund risky order (POST)
    if (pathname.match(/^\/api\/admin\/orders\/[^\/]+\/refund$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const orderId = pathname.split('/')[4];
      const { reason } = body;
      
      const order = await db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // Check if order is on hold or paid
      if (!['hold', 'pending'].includes(order.delivery?.status) && order.status !== 'paid') {
        return NextResponse.json(
          { success: false, error: 'Bu sipariş iade edilemez' },
          { status: 400 }
        );
      }

      // Update order status to refunded
      await db.collection('orders').updateOne(
        { id: order.id },
        {
          $set: {
            status: 'refunded',
            delivery: {
              status: 'cancelled',
              message: reason || 'İade edildi',
              refundedBy: user.username || user.email,
              refundedAt: new Date()
            },
            refundedAt: new Date()
          }
        }
      );

      // Log the refund
      await logAuditAction(db, AUDIT_ACTIONS.ORDER_MANUAL_REFUND, user.id || user.username, 'order', order.id, request, {
        previousStatus: order.status,
        riskScore: order.risk?.score,
        reason: reason || 'Manuel iade'
      });

      // Send refund email (optional)
      const orderUser = await db.collection('users').findOne({ id: order.userId });
      if (orderUser) {
        // TODO: Send refund notification email
      }

      return NextResponse.json({
        success: true,
        message: 'Sipariş iade edildi olarak işaretlendi',
        data: { 
          orderId: order.id,
          status: 'refunded'
        }
      });
    }

    // Admin: Manuel SMS Gönder (Sipariş için)
    if (pathname.match(/^\/api\/admin\/orders\/[^\/]+\/send-sms$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const orderId = pathname.split('/')[4];
      
      // Siparişi bul
      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      // Kullanıcıyı bul
      const orderUser = await db.collection('users').findOne({ id: order.userId });
      if (!orderUser || !orderUser.phone) {
        return NextResponse.json(
          { success: false, error: 'Kullanıcı veya telefon numarası bulunamadı' },
          { status: 400 }
        );
      }

      // Ürün/Hesap bilgisi
      const product = order.productId ? await db.collection('products').findOne({ id: order.productId }) : null;
      const account = order.accountId ? await db.collection('accounts').findOne({ id: order.accountId }) : null;
      const itemTitle = product?.title || account?.title || order.productTitle || order.accountTitle || 'Sipariş';

      console.log('📱 Manuel SMS gönderiliyor:', {
        orderId: order.id,
        phone: orderUser.phone,
        itemTitle
      });

      // SMS gönder
      const result = await sendPaymentSuccessSms(db, order, orderUser, itemTitle);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `SMS gönderildi: ${orderUser.phone}`,
          data: result
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `SMS gönderilemedi: ${result.reason || 'Bilinmeyen hata'}`,
          data: result
        });
      }
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

    // Admin: Update SMS settings
    if (pathname === '/api/admin/settings/sms') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { enabled, usercode, password, msgheader, sendOnPayment, sendOnDelivery } = body;

      // Mevcut ayarları al
      const existingSettings = await db.collection('sms_settings').findOne({ id: 'main' });

      // Şifreyi encrypt et (sadece değişmişse)
      let encryptedPassword = existingSettings?.password || '';
      if (password && password !== '********') {
        encryptedPassword = encrypt(password);
      }

      const smsSettings = {
        id: 'main',
        enabled: enabled || false,
        usercode: usercode || '',
        password: encryptedPassword,
        msgheader: msgheader || 'PINLY',
        sendOnPayment: sendOnPayment !== false,
        sendOnDelivery: sendOnDelivery !== false,
        updatedAt: new Date(),
        updatedBy: user.username || user.email
      };

      await db.collection('sms_settings').updateOne(
        { id: 'main' },
        { $set: smsSettings },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: 'SMS ayarları kaydedildi',
        data: {
          ...smsSettings,
          password: '********'
        }
      });
    }

    // Admin: Test SMS
    if (pathname === '/api/admin/settings/sms/test') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { phone } = body;

      if (!phone) {
        return NextResponse.json(
          { success: false, error: 'Telefon numarası gereklidir' },
          { status: 400 }
        );
      }

      const testMessage = 'Bu bir test mesajidir. SMS sistemi basariyla calisiyor! - PINLY';
      const result = await sendSms(db, phone, testMessage, 'test');

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Test SMS\'i gönderildi',
          data: result
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `SMS gönderilemedi: ${result.reason || result.response || 'Bilinmeyen hata'}`,
          data: result
        });
      }
    }

    // Admin: Özel SMS Gönder
    if (pathname === '/api/admin/settings/sms/custom') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { phone, message } = body;

      if (!phone) {
        return NextResponse.json(
          { success: false, error: 'Telefon numarası gereklidir' },
          { status: 400 }
        );
      }

      if (!message || !message.trim()) {
        return NextResponse.json(
          { success: false, error: 'Mesaj içeriği gereklidir' },
          { status: 400 }
        );
      }

      const result = await sendSms(db, phone, message.trim(), 'custom');

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'SMS gönderildi',
          data: result
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `SMS gönderilemedi: ${result.reason || result.response || 'Bilinmeyen hata'}`,
          data: result
        });
      }
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

      const { logo, favicon, heroImage, valorantHeroImage, mlbbHeroImage, categoryIcon, siteName, metaTitle, metaDescription, contactEmail, contactPhone, dailyBannerEnabled, dailyBannerTitle, dailyBannerSubtitle, dailyBannerIcon, dailyCountdownEnabled, dailyCountdownLabel } = body;

      // Validation
      if (siteName !== undefined && (!siteName || siteName.trim().length === 0)) {
        return NextResponse.json(
          { success: false, error: 'Site adı boş olamaz' },
          { status: 400 }
        );
      }

      if (metaTitle && metaTitle.length > 70) {
        return NextResponse.json(
          { success: false, error: 'META başlık en fazla 70 karakter olabilir' },
          { status: 400 }
        );
      }

      if (metaDescription && metaDescription.length > 160) {
        return NextResponse.json(
          { success: false, error: 'META açıklama en fazla 160 karakter olabilir' },
          { status: 400 }
        );
      }

      if (contactEmail && contactEmail.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
          return NextResponse.json(
            { success: false, error: 'Geçersiz e-posta adresi' },
            { status: 400 }
          );
        }
      }

      // Get existing settings
      const existingSettings = await db.collection('site_settings').findOne({ active: true });

      // Deactivate previous settings
      await db.collection('site_settings').updateMany(
        {},
        { $set: { active: false } }
      );

      // Create new settings (merge with existing)
      const settings = {
        logo: logo !== undefined ? logo : existingSettings?.logo || null,
        favicon: favicon !== undefined ? favicon : existingSettings?.favicon || null,
        heroImage: heroImage !== undefined ? heroImage : existingSettings?.heroImage || null,
        valorantHeroImage: valorantHeroImage !== undefined ? valorantHeroImage : existingSettings?.valorantHeroImage || null,
        mlbbHeroImage: mlbbHeroImage !== undefined ? mlbbHeroImage : existingSettings?.mlbbHeroImage || null,
        categoryIcon: categoryIcon !== undefined ? categoryIcon : existingSettings?.categoryIcon || null,
        siteName: siteName !== undefined ? siteName.trim() : existingSettings?.siteName || 'PINLY',
        metaTitle: metaTitle !== undefined ? metaTitle.trim() : existingSettings?.metaTitle || '',
        metaDescription: metaDescription !== undefined ? metaDescription.trim() : existingSettings?.metaDescription || '',
        contactEmail: contactEmail !== undefined ? contactEmail.trim() : existingSettings?.contactEmail || '',
        contactPhone: contactPhone !== undefined ? contactPhone.trim() : existingSettings?.contactPhone || '',
        dailyBannerEnabled: dailyBannerEnabled !== undefined ? dailyBannerEnabled : existingSettings?.dailyBannerEnabled !== false,
        dailyBannerTitle: dailyBannerTitle !== undefined ? dailyBannerTitle.trim() : existingSettings?.dailyBannerTitle || 'Bugüne Özel Fiyatlar',
        dailyBannerSubtitle: dailyBannerSubtitle !== undefined ? dailyBannerSubtitle.trim() : existingSettings?.dailyBannerSubtitle || '',
        dailyBannerIcon: dailyBannerIcon !== undefined ? dailyBannerIcon.trim() : existingSettings?.dailyBannerIcon || 'fire',
        dailyCountdownEnabled: dailyCountdownEnabled !== undefined ? dailyCountdownEnabled : existingSettings?.dailyCountdownEnabled !== false,
        dailyCountdownLabel: dailyCountdownLabel !== undefined ? dailyCountdownLabel.trim() : existingSettings?.dailyCountdownLabel || 'Kampanya bitimine',
        active: true,
        updatedBy: user.username,
        updatedAt: new Date(),
        createdAt: existingSettings?.createdAt || new Date()
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

      // Check if user already has an open ticket (not closed)
      const openTicket = await db.collection('tickets').findOne({
        userId,
        status: { $ne: 'closed' }
      });

      if (openTicket) {
        return NextResponse.json(
          { success: false, error: 'Zaten açık bir destek talebiniz var. Mevcut talebiniz kapatıldıktan sonra yeni talep açabilirsiniz.' },
          { status: 400 }
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

      // Send support reply email to user
      const ticketUser = await db.collection('users').findOne({ id: ticket.userId });
      if (ticketUser) {
        sendSupportReplyEmail(db, ticket, ticketUser, message).catch(err => 
          console.error('Support reply email failed:', err)
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Yanıt gönderildi',
        data: ticketMessage
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

    // ============================================
    // GOOGLE OAUTH ADMIN ENDPOINTS
    // ============================================

    // Admin: Get Google OAuth Settings
    if (pathname === '/api/admin/settings/oauth/google') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const oauthSettings = await db.collection('oauth_settings').findOne({ provider: 'google' });
      
      // Get base URL from request headers (for correct domain)
      const host = request.headers.get('host');
      // x-forwarded-proto can be "https, https" from multiple proxies, take first value
      const protoHeader = request.headers.get('x-forwarded-proto') || 'https';
      const protocol = protoHeader.split(',')[0].trim();
      const requestBaseUrl = `${protocol}://${host}`;
      
      // Fallback to site settings or env
      const siteSettings = await db.collection('site_settings').findOne({ active: true });
      const baseUrl = requestBaseUrl || siteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      return NextResponse.json({
        success: true,
        data: {
          enabled: oauthSettings?.enabled || false,
          clientId: oauthSettings?.clientId ? maskSensitiveData(decrypt(oauthSettings.clientId)) : '',
          clientSecret: oauthSettings?.clientSecret ? '••••••••' : '',
          hasClientId: !!oauthSettings?.clientId,
          hasClientSecret: !!oauthSettings?.clientSecret,
          baseUrl: baseUrl,
          redirectUri: `${baseUrl}/api/auth/google/callback`,
          authorizedOrigin: baseUrl,
          updatedBy: oauthSettings?.updatedBy || null,
          updatedAt: oauthSettings?.updatedAt || null
        }
      });
    }

    // Admin: Save Google OAuth Settings
    if (pathname === '/api/admin/settings/oauth/google' && request.method === 'POST') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { enabled, clientId, clientSecret } = body;

      // Get existing settings
      const existingSettings = await db.collection('oauth_settings').findOne({ provider: 'google' });

      // Prepare update data
      const updateData = {
        provider: 'google',
        enabled: enabled === true,
        updatedBy: user.username,
        updatedAt: new Date()
      };

      // Only update clientId if provided and not masked
      if (clientId && !clientId.includes('*')) {
        updateData.clientId = encrypt(clientId.trim());
      } else if (existingSettings?.clientId) {
        updateData.clientId = existingSettings.clientId;
      }

      // Only update clientSecret if provided and not masked
      if (clientSecret && clientSecret !== '••••••••' && !clientSecret.includes('•')) {
        updateData.clientSecret = encrypt(clientSecret.trim());
      } else if (existingSettings?.clientSecret) {
        updateData.clientSecret = existingSettings.clientSecret;
      }

      // Validation: If enabling, must have both clientId and clientSecret
      if (updateData.enabled && (!updateData.clientId || !updateData.clientSecret)) {
        return NextResponse.json(
          { success: false, error: 'Google OAuth aktif etmek için Client ID ve Client Secret gereklidir' },
          { status: 400 }
        );
      }

      // Upsert the settings
      await db.collection('oauth_settings').updateOne(
        { provider: 'google' },
        { 
          $set: updateData,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      // Log the action (audit)
      await db.collection('admin_logs').insertOne({
        id: uuidv4(),
        action: 'oauth_settings_update',
        provider: 'google',
        enabled: updateData.enabled,
        updatedBy: user.username,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        createdAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Google OAuth ayarları güncellendi'
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

    // ============================================
    // RISK MANAGEMENT POST ENDPOINTS
    // ============================================

    // Admin: Save risk settings
    if (pathname === '/api/admin/risk/settings') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { isEnabled, isTestMode, thresholds, weights, hardBlocks, suspiciousAutoApprove } = body;

      const settings = {
        id: 'main',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        isTestMode: isTestMode !== undefined ? isTestMode : false,
        thresholds: thresholds || DEFAULT_RISK_SETTINGS.thresholds,
        weights: weights || DEFAULT_RISK_SETTINGS.weights,
        hardBlocks: hardBlocks || DEFAULT_RISK_SETTINGS.hardBlocks,
        suspiciousAutoApprove: suspiciousAutoApprove !== undefined ? suspiciousAutoApprove : false,
        updatedAt: new Date(),
        updatedBy: user.username || user.id
      };

      await db.collection('risk_settings').updateOne(
        { id: 'main' },
        { $set: settings },
        { upsert: true }
      );

      // Log the change
      await logAuditAction(db, 'RISK_SETTINGS_UPDATE', user.id || user.username, 'risk_settings', 'main', request, {
        changes: body
      });

      return NextResponse.json({
        success: true,
        message: 'Risk ayarları kaydedildi',
        data: settings
      });
    }

    // Admin: Add to blacklist
    if (pathname === '/api/admin/risk/blacklist') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { type, value, reason } = body;

      if (!type || !value) {
        return NextResponse.json(
          { success: false, error: 'Tip ve değer zorunludur' },
          { status: 400 }
        );
      }

      const validTypes = ['email', 'phone', 'ip', 'playerId', 'domain'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz tip' },
          { status: 400 }
        );
      }

      // Check if already exists
      const existing = await db.collection('blacklist').findOne({
        type,
        value: value.toLowerCase()
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Bu kayıt zaten mevcut' },
          { status: 400 }
        );
      }

      const blacklistEntry = {
        id: uuidv4(),
        type,
        value: value.toLowerCase(),
        reason: reason || '',
        isActive: true,
        createdAt: new Date(),
        createdBy: user.username || user.id
      };

      await db.collection('blacklist').insertOne(blacklistEntry);

      // Log the action
      await logAuditAction(db, 'BLACKLIST_ADD', user.id || user.username, 'blacklist', blacklistEntry.id, request, {
        type,
        value: value.toLowerCase()
      });

      return NextResponse.json({
        success: true,
        message: 'Kara listeye eklendi',
        data: blacklistEntry
      });
    }

    // Admin: Toggle blacklist item active status
    if (pathname.match(/^\/api\/admin\/risk\/blacklist\/[^\/]+\/toggle$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const itemId = pathname.split('/')[5];
      const item = await db.collection('blacklist').findOne({ id: itemId });

      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Kayıt bulunamadı' },
          { status: 404 }
        );
      }

      await db.collection('blacklist').updateOne(
        { id: itemId },
        { $set: { isActive: !item.isActive, updatedAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        message: item.isActive ? 'Kayıt pasif yapıldı' : 'Kayıt aktif yapıldı'
      });
    }

    // ============================================
    // BLOG POST ENDPOINTS
    // ============================================

    // Admin: Create blog post
    if (pathname === '/api/admin/blog') {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }

      const { title, content, excerpt, category, coverImage, tags, status } = body;

      if (!title || !content) {
        return NextResponse.json(
          { success: false, error: 'Başlık ve içerik zorunludur' },
          { status: 400 }
        );
      }

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[ğ]/g, 'g')
        .replace(/[ü]/g, 'u')
        .replace(/[ş]/g, 's')
        .replace(/[ı]/g, 'i')
        .replace(/[ö]/g, 'o')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);

      // Check if slug exists
      const existingSlug = await db.collection('blog_posts').findOne({ slug });
      const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

      const post = {
        id: uuidv4(),
        title,
        slug: finalSlug,
        content,
        excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        category: category || 'genel',
        coverImage: coverImage || null,
        tags: tags || [],
        status: status || 'draft',
        views: 0,
        authorId: user.id || user.username,
        authorName: user.username || 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: status === 'published' ? new Date() : null
      };

      await db.collection('blog_posts').insertOne(post);

      return NextResponse.json({
        success: true,
        message: 'Blog yazısı oluşturuldu',
        data: post
      });
    }

    // ============================================
    // DIJIPIN SETTINGS UPDATE (MOVED HERE)
    // ============================================
    if (pathname === '/api/admin/dijipin/settings') {
      // Loose auth check for admin panel
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }
      
      const { isEnabled } = body;
      
      await db.collection('settings').updateOne(
        { type: 'dijipin' },
        { 
          $set: { 
            type: 'dijipin',
            isEnabled: isEnabled,
            supportedProducts: ['60 UC', '325 UC'],
            updatedAt: new Date(),
            updatedBy: 'admin'
          } 
        },
        { upsert: true }
      );
      
      return NextResponse.json({
        success: true,
        message: 'DijiPin ayarları güncellendi'
      });
    }

    // ============================================
    // 🎮 PUBG HESAP SATIŞ API - ORDER CREATION
    // ============================================

    // Hesap Siparişi Oluştur (AUTH REQUIRED)
    if (pathname === '/api/account-orders') {
      // Verify user authentication
      const authUser = verifyToken(request);
      if (!authUser || authUser.type !== 'user') {
        return NextResponse.json(
          { success: false, error: 'Sipariş vermek için giriş yapmalısınız', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const { accountId, paymentMethod } = body;
      
      if (!accountId) {
        return NextResponse.json(
          { success: false, error: 'Hesap ID gerekli' },
          { status: 400 }
        );
      }

      // Get user details
      const user = await db.collection('users').findOne({ id: authUser.id });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }

      // Validate user has required customer information
      if (!user.firstName || !user.lastName || !user.email || !user.phone) {
        return NextResponse.json(
          { success: false, error: 'Profil bilgileriniz eksik. Lütfen hesap ayarlarından tamamlayın.', code: 'INCOMPLETE_PROFILE' },
          { status: 400 }
        );
      }

      // Get account (price controlled by backend)
      const account = await db.collection('accounts').findOne({ 
        id: accountId, 
        active: true
      });

      if (!account) {
        return NextResponse.json({ success: false, error: 'Hesap bulunamadı veya satışta değil' }, { status: 404 });
      }

      // Check if stock available (for non-unlimited accounts)
      let availableStock = null;
      if (!account.unlimited) {
        availableStock = await db.collection('account_stock').findOne({
          accountId,
          status: 'available'
        });
        
        if (!availableStock) {
          return NextResponse.json({ success: false, error: 'Bu hesap için stok bulunmuyor' }, { status: 400 });
        }
      } else {
        // For unlimited accounts, still try to get stock if available
        availableStock = await db.collection('account_stock').findOne({
          accountId,
          status: 'available'
        });
      }

      const orderAmount = account.discountPrice || account.price || 0;
      const customerSnapshot = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      };

      // Balance Payment
      if (paymentMethod === 'balance') {
        const userBalance = user.balance || 0;

        if (userBalance < orderAmount) {
          return NextResponse.json(
            { success: false, error: `Yetersiz bakiye. Mevcut: ${userBalance.toFixed(2)} ₺, Gerekli: ${orderAmount.toFixed(2)} ₺` },
            { status: 400 }
          );
        }

        // Assign stock to order
        let assignedCredentials = account.credentials || null; // Fallback to account's default credentials
        if (availableStock) {
          assignedCredentials = availableStock.credentials;
          // Mark stock as assigned
          await db.collection('account_stock').updateOne(
            { id: availableStock.id },
            { 
              $set: { 
                status: 'assigned',
                assignedAt: new Date()
              }
            }
          );
        }

        // Create order
        const order = {
          id: uuidv4(),
          type: 'account', // HESAP SİPARİŞİ
          userId: user.id,
          accountId: accountId,
          accountTitle: account.title,
          accountImageUrl: account.imageUrl || null,
          customer: customerSnapshot,
          status: 'paid',
          paymentMethod: 'balance',
          amount: orderAmount,
          totalAmount: orderAmount,
          currency: 'TRY',
          delivery: {
            status: assignedCredentials ? 'delivered' : 'pending',
            message: assignedCredentials ? 'Hesap bilgileri hazır' : 'Hesap bilgileri hazırlanıyor...',
            credentials: assignedCredentials,
            stockId: availableStock?.id || null
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Update stock with order ID
        if (availableStock) {
          await db.collection('account_stock').updateOne(
            { id: availableStock.id },
            { $set: { orderId: order.id } }
          );
        }

        // Deduct balance
        const newBalance = userBalance - orderAmount;
        await db.collection('users').updateOne(
          { id: user.id },
          { $set: { balance: newBalance, updatedAt: new Date() } }
        );

        // Balance transaction record
        await db.collection('balance_transactions').insertOne({
          id: uuidv4(),
          userId: user.id,
          type: 'account_purchase',
          amount: -orderAmount,
          balanceBefore: userBalance,
          balanceAfter: newBalance,
          description: `Hesap satın alma: ${account.title}`,
          orderId: order.id,
          createdAt: new Date()
        });

        // Insert order
        await db.collection('orders').insertOne(order);

        // SMS gönder - Hesap bakiye ödemesi başarılı
        sendPaymentSuccessSms(db, order, user, account.title).catch(err =>
          console.error('Account balance payment SMS failed:', err)
        );

        // Mark account as sold ONLY if not unlimited AND no more stock
        if (!account.unlimited) {
          // Check remaining stock
          const remainingStock = await db.collection('account_stock').countDocuments({
            accountId,
            status: 'available'
          });
          
          if (remainingStock === 0) {
            await db.collection('accounts').updateOne(
              { id: accountId },
              { 
                $set: { 
                  status: 'sold', 
                  stockCount: 0,
                  soldAt: new Date(),
                  soldToUserId: user.id,
                  orderId: order.id
                } 
              }
            );
          } else {
            // Update stock count
            await db.collection('accounts').updateOne(
              { id: accountId },
              { $set: { stockCount: remainingStock } }
            );
          }
        } else {
          // For unlimited accounts, just increment sales count and update stock count
          const remainingStock = await db.collection('account_stock').countDocuments({
            accountId,
            status: 'available'
          });
          
          await db.collection('accounts').updateOne(
            { id: accountId },
            { 
              $inc: { salesCount: 1 },
              $set: { lastSoldAt: new Date(), stockCount: remainingStock }
            }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Hesap siparişi oluşturuldu!',
          data: { orderId: order.id }
        });
      }

      // Card Payment - Shopier
      const shopierSettings = await db.collection('shopier_settings').findOne({ isActive: true });
      if (!shopierSettings) {
        return NextResponse.json(
          { success: false, error: 'Ödeme sistemi yapılandırılmamış' },
          { status: 503 }
        );
      }

      // Create pending order
      const order = {
        id: uuidv4(),
        type: 'account', // HESAP SİPARİŞİ
        userId: user.id,
        accountId: accountId,
        accountTitle: account.title,
        accountImageUrl: account.imageUrl || null,
        customer: customerSnapshot,
        status: 'pending',
        paymentMethod: 'card',
        amount: orderAmount,
        totalAmount: orderAmount,
        currency: 'TRY',
        delivery: {
          status: 'pending',
          message: 'Ödeme bekleniyor...',
          credentials: null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('orders').insertOne(order);

      // Mark account as reserved temporarily (only for non-unlimited accounts)
      if (!account.unlimited) {
        await db.collection('accounts').updateOne(
          { id: accountId },
          { $set: { status: 'reserved', reservedAt: new Date(), reservedByOrderId: order.id } }
        );
      }

      // Generate Shopier form - use same format as UC orders
      const apiKey = decrypt(shopierSettings.apiKey);
      const apiSecret = decrypt(shopierSettings.apiSecret);
      
      // Generate random number for Shopier request (6 digits as per API spec)
      const randomNr = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
      const crypto = require('crypto');

      // Currency codes: 0 = TRY, 1 = USD, 2 = EUR
      const currencyCode = 0; // TRY

      // Prepare Shopier payment request with REAL customer data
      // E-posta adresi maskeleniyor - Shopier'den müşteriye mail gitmesin
      const maskedEmail = maskEmailForShopier(customerSnapshot.email);
      const shopierPayload = {
        API_key: apiKey,
        website_index: 1,
        platform_order_id: order.id,
        product_name: 'Bakiye Yüklemesi',
        product_type: 1, // 0 = Physical, 1 = Digital
        buyer_name: customerSnapshot.firstName,
        buyer_surname: customerSnapshot.lastName,
        buyer_email: maskedEmail, // Maskelenmiş e-posta
        buyer_account_age: 0,
        buyer_id_nr: '',
        buyer_phone: customerSnapshot.phone,
        billing_address: 'Turkey',
        billing_city: 'Istanbul',
        billing_country: 'Turkey',
        billing_postcode: '34000',
        shipping_address: 'Turkey',
        shipping_city: 'Istanbul',
        shipping_country: 'Turkey',
        shipping_postcode: '34000',
        total_order_value: orderAmount,
        currency: currencyCode,
        platform: 0,
        is_in_frame: 0,
        current_language: 0,
        modul_version: '1.0.4',
        random_nr: randomNr,
      };

      // Generate Shopier signature
      const signatureData = `${randomNr}${order.id}${orderAmount}${currencyCode}`;
      const signature = crypto.createHmac('sha256', apiSecret)
        .update(signatureData)
        .digest('base64');

      shopierPayload.signature = signature;

      const paymentUrl = 'https://www.shopier.com/ShowProduct/api_pay4.php';

      // Store payment request for audit
      await db.collection('payment_requests').insertOne({
        orderId: order.id,
        type: 'account',
        shopierPayload: { ...shopierPayload, API_key: '***MASKED***', signature: '***MASKED***' },
        createdAt: new Date()
      });

      return NextResponse.json({
        success: true,
        data: {
          orderId: order.id,
          paymentUrl,
          formData: shopierPayload
        }
      });
    }

    // Customer: Get verification status

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

      // Send password changed email
      sendPasswordChangedEmail(db, user).catch(err => 
        console.error('Password changed email failed:', err)
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

    // Update blog post
    if (pathname.match(/^\/api\/admin\/blog\/[^\/]+$/)) {
      const postId = pathname.split('/').pop();
      
      const existingPost = await db.collection('blog_posts').findOne({ id: postId });
      if (!existingPost) {
        return NextResponse.json(
          { success: false, error: 'Yazı bulunamadı' },
          { status: 404 }
        );
      }

      const updateData = {
        ...body,
        updatedAt: new Date()
      };

      // If status changed to published and wasn't published before
      if (body.status === 'published' && existingPost.status !== 'published') {
        updateData.publishedAt = new Date();
      }

      await db.collection('blog_posts').updateOne(
        { id: postId },
        { $set: updateData }
      );

      const updated = await db.collection('blog_posts').findOne({ id: postId });

      return NextResponse.json({
        success: true,
        message: 'Blog yazısı güncellendi',
        data: updated
      });
    }

    // Update product
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+$/)) {
      const productId = pathname.split('/').pop();
      
      await db.collection('products').updateOne(
        { id: productId },
        { $set: { ...body, updatedAt: new Date() } }
      );

      const updated = await db.collection('products').findOne({ id: productId });
      
      // Clear cache
      clearCache('products_active');
      if (updated?.game) {
        clearCache(`products_active_${updated.game}`);
      }
      
      return NextResponse.json({
        success: true,
        data: updated
      });
    }

    // Update PUBG Account (Admin)
    if (pathname.match(/^\/api\/admin\/accounts\/[^\/]+$/)) {
      const accountId = pathname.split('/').pop();
      
      const existingAccount = await db.collection('accounts').findOne({ id: accountId });
      if (!existingAccount) {
        return NextResponse.json(
          { success: false, error: 'Hesap bulunamadı' },
          { status: 404 }
        );
      }

      const updateData = {
        ...body,
        updatedAt: new Date(),
        updatedBy: user.username
      };

      // Calculate discount percent if both prices provided
      if (body.price && body.discountPrice) {
        updateData.discountPercent = Math.round(((body.price - body.discountPrice) / body.price) * 100);
      }

      await db.collection('accounts').updateOne(
        { id: accountId },
        { $set: updateData }
      );

      const updated = await db.collection('accounts').findOne({ id: accountId });

      return NextResponse.json({
        success: true,
        message: 'Hesap güncellendi',
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

      // Send password changed email
      sendPasswordChangedEmail(db, user).catch(err => 
        console.error('Password changed email failed:', err)
      );

      return NextResponse.json({
        success: true,
        message: 'Şifreniz başarıyla güncellendi'
      });
    }

    // ============================================
    // DIJIPIN SETTINGS UPDATE
    // ============================================
    if (pathname === '/api/admin/dijipin/settings') {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }
      
      const { isEnabled } = body;
      
      await db.collection('settings').updateOne(
        { type: 'dijipin' },
        { 
          $set: { 
            type: 'dijipin',
            isEnabled: isEnabled,
            updatedAt: new Date(),
            updatedBy: adminUser.username
          } 
        },
        { upsert: true }
      );
      
      return NextResponse.json({
        success: true,
        message: 'DijiPin ayarları güncellendi'
      });
    }

    // Admin: Manually require verification for an order
    if (pathname.match(/^\/api\/admin\/orders\/([^\/]+)\/require-verification$/)) {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const orderId = pathname.match(/^\/api\/admin\/orders\/([^\/]+)\/require-verification$/)[1];

      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) {
        return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
      }

      // Update order to require verification
      await db.collection('orders').updateOne(
        { id: orderId },
        {
          $set: {
            verification: {
              required: true,
              status: 'pending',
              identityPhoto: null,
              paymentReceipt: null,
              submittedAt: null,
              reviewedAt: null,
              reviewedBy: null,
              rejectionReason: null
            },
            'delivery.status': 'verification_required',
            'delivery.message': 'Yüksek tutarlı sipariş - Kimlik ve ödeme dekontu doğrulaması gerekli',
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Sipariş doğrulama gerektiren duruma alındı'
      });
    }

    // Admin: Approve/Reject verification & Assign stock
    if (pathname.match(/^\/api\/admin\/orders\/([^\/]+)\/verify$/)) {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const orderId = pathname.match(/^\/api\/admin\/orders\/([^\/]+)\/verify$/)[1];
      const { action, rejectionReason } = body; // action: 'approve' or 'reject'

      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) {
        return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
      }

      if (!order.verification || !order.verification.required) {
        return NextResponse.json({ success: false, error: 'Bu sipariş doğrulama gerektirmiyor' }, { status: 400 });
      }

      if (action === 'approve') {
        // Update verification status to approved
        await db.collection('orders').updateOne(
          { id: orderId },
          {
            $set: {
              'verification.status': 'approved',
              'verification.reviewedAt': new Date(),
              'verification.reviewedBy': adminUser.username
            }
          }
        );

        // Delete verification files (as per requirement)
        if (order.verification.identityPhoto) {
          deleteUploadedFile(order.verification.identityPhoto);
        }
        if (order.verification.paymentReceipt) {
          deleteUploadedFile(order.verification.paymentReceipt);
        }

        // NOW ASSIGN STOCK (same logic as auto-assignment)
        const product = await db.collection('products').findOne({ id: order.productId });
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
            sort: { createdAt: 1 }
          }
        );

        if (assignedStock && assignedStock.value) {
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

          // Send delivered email
          const orderUser = await db.collection('users').findOne({ id: order.userId });
          if (orderUser && product) {
            sendDeliveredEmail(db, order, orderUser, product, [stockCode]).catch(err => 
              console.error('Delivered email failed:', err)
            );
          }

          await logAuditAction(db, AUDIT_ACTIONS.ORDER_VERIFICATION_APPROVE, adminUser.username, 'order', orderId, request, {
            stockAssigned: true,
            stockCode: '***MASKED***'
          });

          return NextResponse.json({
            success: true,
            message: 'Doğrulama onaylandı ve stok atandı'
          });
        } else {
          // No stock available
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

          await logAuditAction(db, AUDIT_ACTIONS.ORDER_VERIFICATION_APPROVE, adminUser.username, 'order', orderId, request, {
            stockAssigned: false,
            reason: 'out_of_stock'
          });

          return NextResponse.json({
            success: true,
            message: 'Doğrulama onaylandı ancak stok yok. Manuel teslimat gerekli.'
          });
        }

      } else if (action === 'reject') {
        // Update verification status to rejected
        await db.collection('orders').updateOne(
          { id: orderId },
          {
            $set: {
              'verification.status': 'rejected',
              'verification.reviewedAt': new Date(),
              'verification.reviewedBy': adminUser.username,
              'verification.rejectionReason': rejectionReason || 'Doğrulama belgeleri uygun değil',
              status: 'cancelled', // Cancel order
              delivery: {
                status: 'cancelled',
                message: `Doğrulama reddedildi: ${rejectionReason || 'Belgeler uygun değil'}`
              }
            }
          }
        );

        // Delete verification files
        if (order.verification.identityPhoto) {
          deleteUploadedFile(order.verification.identityPhoto);
        }
        if (order.verification.paymentReceipt) {
          deleteUploadedFile(order.verification.paymentReceipt);
        }

        await logAuditAction(db, AUDIT_ACTIONS.ORDER_VERIFICATION_REJECT, adminUser.username, 'order', orderId, request, {
          reason: rejectionReason
        });

        // Send rejection email
        const orderUser = await db.collection('users').findOne({ id: order.userId });
        if (orderUser) {
          sendVerificationRejectedEmail(db, order, orderUser, rejectionReason).catch(err => 
            console.error('Rejection email failed:', err)
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Doğrulama reddedildi ve sipariş iptal edildi. Para iadesi için Shopier panelinden işlem yapın.'
        });
      } else {
        return NextResponse.json({ success: false, error: 'Geçersiz işlem' }, { status: 400 });
      }
    }

    // ============================================
    // 💰 BALANCE SYSTEM ENDPOINTS (PUT)
    // ============================================
    
    // Admin: Update user balance (add/subtract)
    if (pathname.match(/^\/api\/admin\/users\/([^\/]+)\/balance$/)) {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const userId = pathname.match(/^\/api\/admin\/users\/([^\/]+)\/balance$/)[1];
      const { amount, type, note } = body; // type: 'add' or 'subtract'

      if (!amount || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Geçerli bir tutar giriniz' }, { status: 400 });
      }

      if (!['add', 'subtract'].includes(type)) {
        return NextResponse.json({ success: false, error: 'Geçersiz işlem tipi' }, { status: 400 });
      }

      const user = await db.collection('users').findOne({ id: userId });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }

      const currentBalance = user.balance || 0;
      const changeAmount = type === 'add' ? amount : -amount;
      const newBalance = currentBalance + changeAmount;

      if (newBalance < 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Bakiye negatif olamaz. Mevcut bakiye: ' + currentBalance.toFixed(2) + ' TL' 
        }, { status: 400 });
      }

      // Update user balance
      await db.collection('users').updateOne(
        { id: userId },
        { $set: { balance: newBalance, updatedAt: new Date() } }
      );

      // Create transaction record
      const transaction = {
        id: uuidv4(),
        userId,
        type: type === 'add' ? 'admin_credit' : 'admin_debit',
        amount: Math.abs(changeAmount),
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: note || (type === 'add' ? 'Admin tarafından bakiye eklendi' : 'Admin tarafından bakiye düşüldü'),
        adminUsername: adminUser.username,
        createdAt: new Date()
      };

      await db.collection('balance_transactions').insertOne(transaction);

      // Audit log
      await logAuditAction(db, type === 'add' ? 'user.balance_add' : 'user.balance_subtract', adminUser.username, 'user', userId, request, {
        amount: changeAmount,
        newBalance,
        note
      });

      return NextResponse.json({
        success: true,
        message: type === 'add' ? 'Bakiye eklendi' : 'Bakiye düşüldü',
        data: {
          newBalance,
          transaction
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

    // Admin: Clear/Reset product stock (delete all available stock items)
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+\/stock\/clear$/)) {
      const productId = pathname.split('/')[4];
      
      // Validate product exists
      const product = await db.collection('products').findOne({ id: productId });
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Ürün bulunamadı' },
          { status: 404 }
        );
      }

      // Delete only available stock items (not assigned ones)
      const deleteResult = await db.collection('stock').deleteMany({ 
        productId: productId,
        status: 'available'
      });

      return NextResponse.json({
        success: true,
        message: `${deleteResult.deletedCount} adet mevcut stok silindi`,
        data: {
          deletedCount: deleteResult.deletedCount
        }
      });
    }

    // Delete blog post
    if (pathname.match(/^\/api\/admin\/blog\/[^\/]+$/)) {
      const postId = pathname.split('/').pop();
      
      const post = await db.collection('blog_posts').findOne({ id: postId });
      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Yazı bulunamadı' },
          { status: 404 }
        );
      }

      await db.collection('blog_posts').deleteOne({ id: postId });

      return NextResponse.json({
        success: true,
        message: 'Blog yazısı silindi'
      });
    }

    // Reset product stock (Delete all stock for a product)
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+\/stock\/reset$/)) {
      const productId = pathname.split('/')[4];
      
      const product = await db.collection('products').findOne({ id: productId });
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Ürün bulunamadı' },
          { status: 404 }
        );
      }

      // Delete all stock items for this product
      const deleteResult = await db.collection('stock').deleteMany({ 
        productId: productId,
        status: 'available' // Only delete available stock, not assigned ones
      });

      // Log the action
      await logAuditAction(db, AUDIT_ACTIONS.STOCK_RESET, user.id || user.username, 'product', productId, request, {
        productTitle: product.title,
        stocksDeleted: deleteResult.deletedCount
      });

      return NextResponse.json({
        success: true,
        message: `${deleteResult.deletedCount} adet stok sıfırlandı`,
        data: {
          productId: productId,
          stocksDeleted: deleteResult.deletedCount
        }
      });
    }

    // Delete PUBG Account (Admin)
    if (pathname.match(/^\/api\/admin\/accounts\/[^\/]+$/)) {
      const accountId = pathname.split('/').pop();
      
      const account = await db.collection('accounts').findOne({ id: accountId });
      if (!account) {
        return NextResponse.json(
          { success: false, error: 'Hesap bulunamadı' },
          { status: 404 }
        );
      }

      // Satılmış hesap silinemez
      if (account.status === 'sold') {
        return NextResponse.json(
          { success: false, error: 'Satılmış hesap silinemez' },
          { status: 400 }
        );
      }

      await db.collection('accounts').deleteOne({ id: accountId });

      return NextResponse.json({
        success: true,
        message: 'Hesap silindi'
      });
    }

    // Delete product (HARD DELETE - permanently remove from database)
    if (pathname.match(/^\/api\/admin\/products\/[^\/]+$/)) {
      const user = verifyAdminToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz erişim' },
          { status: 401 }
        );
      }
      
      const productId = pathname.split('/').pop();
      
      // Get product info before deletion (for image cleanup and audit)
      const product = await db.collection('products').findOne({ id: productId });
      
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Ürün bulunamadı' },
          { status: 404 }
        );
      }
      
      // Delete product from database
      const deleteResult = await db.collection('products').deleteOne({ id: productId });
      
      if (deleteResult.deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Ürün silinemedi' },
          { status: 500 }
        );
      }
      
      // Delete all stock items associated with this product
      const stockDeleteResult = await db.collection('stocks').deleteMany({ productId: productId });
      
      // Audit log - product deletion
      await logAuditAction(db, AUDIT_ACTIONS.PRODUCT_DELETE, user.id || user.email, 'product', productId, request, {
        productTitle: product.title,
        ucAmount: product.ucAmount,
        stocksDeleted: stockDeleteResult.deletedCount
      });
      
      // Optionally delete uploaded image if it's a local file
      if (product.imageUrl && product.imageUrl.startsWith('/uploads/')) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const imagePath = path.join(process.cwd(), 'public', product.imageUrl);
          await fs.unlink(imagePath);
        } catch (err) {
          // Image might not exist or already deleted, continue
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Ürün ve stokları tamamen silindi',
        data: {
          productDeleted: true,
          stocksDeleted: stockDeleteResult.deletedCount
        }
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

    // Delete blacklist item
    if (pathname.match(/^\/api\/admin\/risk\/blacklist\/[^\/]+$/)) {
      const itemId = pathname.split('/').pop();
      
      const item = await db.collection('blacklist').findOne({ id: itemId });
      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Kayıt bulunamadı' },
          { status: 404 }
        );
      }
      
      await db.collection('blacklist').deleteOne({ id: itemId });
      
      // Log the action
      await logAuditAction(db, 'BLACKLIST_DELETE', user.id || user.username, 'blacklist', itemId, request, {
        type: item.type,
        value: item.value
      });
      
      return NextResponse.json({
        success: true,
        message: 'Kayıt kara listeden silindi'
      });
    }

    // ============================================
    // SPIN WHEEL - ÇARK ÇEVİR SİSTEMİ
    // ============================================
    
    // Çark ayarlarını getir
    if (pathname === '/api/spin-wheel/settings') {
      const settings = await db.collection('settings').findOne({ type: 'spin_wheel' });
      
      const defaultSettings = {
        type: 'spin_wheel',
        isEnabled: true,
        prizes: [
          { id: 1, name: '150₺ İndirim', amount: 150, minOrder: 1500, chance: 2, color: '#FFD700' },
          { id: 2, name: '100₺ İndirim', amount: 100, minOrder: 1000, chance: 5, color: '#FF6B00' },
          { id: 3, name: '50₺ İndirim', amount: 50, minOrder: 500, chance: 15, color: '#3B82F6' },
          { id: 4, name: '25₺ İndirim', amount: 25, minOrder: 250, chance: 25, color: '#10B981' },
          { id: 5, name: '10₺ İndirim', amount: 10, minOrder: 100, chance: 30, color: '#8B5CF6' },
          { id: 6, name: 'Boş - Tekrar Dene', amount: 0, minOrder: 0, chance: 23, color: '#6B7280' }
        ],
        expiryDays: 7,
        dailySpins: 1
      };
      
      return NextResponse.json({
        success: true,
        data: settings || defaultSettings
      });
    }
    
    // Kullanıcının indirim bakiyesini getir
    if (pathname === '/api/user/discount-balance') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Giriş yapmalısınız' }, { status: 401 });
      }
      
      const token = authHeader.replace('Bearer ', '');
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Geçersiz token' }, { status: 401 });
      }
      
      const spinUser = await db.collection('users').findOne({ id: decoded.userId });
      if (!spinUser) {
        return NextResponse.json({ success: false, error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }
      
      // İndirim süresi dolmuş mu kontrol et
      let discountBalance = spinUser.discountBalance || 0;
      let discountMinOrder = spinUser.discountMinOrder || 0;
      let discountExpiry = spinUser.discountExpiry;
      
      if (discountExpiry && new Date(discountExpiry) < new Date()) {
        // Süresi dolmuş, sıfırla
        await db.collection('users').updateOne(
          { id: spinUser.id },
          { $unset: { discountBalance: '', discountMinOrder: '', discountExpiry: '', discountSource: '' } }
        );
        discountBalance = 0;
        discountMinOrder = 0;
        discountExpiry = null;
      }
      
      // Bugün çevirmiş mi?
      const today = new Date().toISOString().split('T')[0];
      const lastSpin = spinUser.lastSpinDate ? new Date(spinUser.lastSpinDate).toISOString().split('T')[0] : null;
      const canSpin = lastSpin !== today;
      
      return NextResponse.json({
        success: true,
        data: {
          discountBalance,
          discountMinOrder,
          discountExpiry,
          canSpin,
          nextSpinTime: canSpin ? null : getNextMidnight(),
          lastSpinDate: spinUser.lastSpinDate
        }
      });
    }
    
    // Admin - Çark istatistikleri
    if (pathname === '/api/admin/spin-wheel/stats') {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const [todaySpins, weekSpins, totalSpins, prizeStats] = await Promise.all([
        db.collection('spin_history').countDocuments({ createdAt: { $gte: today } }),
        db.collection('spin_history').countDocuments({ createdAt: { $gte: weekAgo } }),
        db.collection('spin_history').countDocuments({}),
        db.collection('spin_history').aggregate([
          { $group: { _id: '$prizeName', count: { $sum: 1 }, totalAmount: { $sum: '$prizeAmount' } } }
        ]).toArray()
      ]);
      
      return NextResponse.json({
        success: true,
        data: {
          todaySpins,
          weekSpins,
          totalSpins,
          prizeStats
        }
      });
    }

    // ============================================
    // 🎮 PUBG HESAP SATIŞ API - ADMIN ENDPOINTS
    // ============================================

    // Admin: Hesap Listesi
    if (pathname === '/api/admin/accounts') {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const accounts = await db.collection('accounts')
        .find({})
        .sort({ order: 1, createdAt: -1 })
        .toArray();

      return NextResponse.json({ success: true, data: accounts });
    }

    // Admin: Tek Hesap Detayı
    if (pathname.match(/^\/api\/admin\/accounts\/([^\/]+)$/)) {
      const adminUser = verifyAdminToken(request);
      if (!adminUser) {
        return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
      }

      const accountId = pathname.split('/').pop();
      const account = await db.collection('accounts').findOne({ id: accountId });

      if (!account) {
        return NextResponse.json({ success: false, error: 'Hesap bulunamadı' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: account });
    }

    // ============================================
    // 🎮 PUBG HESAP SATIŞ API - PUBLIC ENDPOINTS
    // ============================================

    // Public: Aktif Hesap Listesi
    if (pathname === '/api/accounts') {
      const accounts = await db.collection('accounts')
        .find({ active: true, status: 'available' })
        .sort({ order: 1, createdAt: -1 })
        .toArray();

      // Hassas bilgileri gizle
      const publicAccounts = accounts.map(acc => {
        console.log('Account order:', acc.title, acc.order); // DEBUG
        return {
          id: acc.id,
          title: acc.title,
          description: acc.description,
          price: acc.price,
          discountPrice: acc.discountPrice,
          discountPercent: acc.discountPercent,
          imageUrl: acc.imageUrl,
          legendaryMin: acc.legendaryMin,
          legendaryMax: acc.legendaryMax,
          level: acc.level,
          rank: acc.rank,
          features: acc.features,
          order: acc.order || 0,
          createdAt: acc.createdAt
        };
      });

      return NextResponse.json({ success: true, data: publicAccounts });
    }

    // Public: Tek Hesap Detayı
    if (pathname.match(/^\/api\/accounts\/([^\/]+)$/)) {
      const accountId = pathname.split('/').pop();
      const account = await db.collection('accounts').findOne({ 
        id: accountId, 
        active: true, 
        status: 'available' 
      });

      if (!account) {
        return NextResponse.json({ success: false, error: 'Hesap bulunamadı' }, { status: 404 });
      }

      // Hassas bilgileri gizle
      const publicAccount = {
        id: account.id,
        title: account.title,
        description: account.description,
        price: account.price,
        discountPrice: account.discountPrice,
        discountPercent: account.discountPercent,
        imageUrl: account.imageUrl,
        legendaryMin: account.legendaryMin,
        legendaryMax: account.legendaryMax,
        level: account.level,
        rank: account.rank,
        features: account.features,
        createdAt: account.createdAt
      };

      return NextResponse.json({ success: true, data: publicAccount });
    }

    // Account orders endpoint moved to POST function

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