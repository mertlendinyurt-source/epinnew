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
};

// ============================================
// RISK SCORING SYSTEM
// ============================================
const RISK_THRESHOLD = 40; // Orders with score >= 40 are flagged

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
    // TR order + phone doesn't start with 5
    const isTROrder = order.region === 'TR' || order.currency === 'TRY';
    if (isTROrder && !phone.startsWith('5') && !phone.startsWith('905')) {
      score += weights.phoneTRNotStartsWith5 || 30;
      reasons.push({ code: 'PHONE_TR_FORMAT', label: 'TR siparişi - telefon 5 ile başlamıyor', points: weights.phoneTRNotStartsWith5 || 30 });
    }
    
    // Phone length check (should be 10 or 11 digits for TR)
    const cleanPhone = phone.replace(/^90/, ''); // Remove country code
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      score += weights.phoneInvalidLength || 20;
      reasons.push({ code: 'PHONE_LENGTH', label: 'Telefon uzunluğu geçersiz', points: weights.phoneInvalidLength || 20 });
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
    }
  });
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

// Premium HTML Email Template Generator
function generateEmailTemplate(content, settings = {}) {
  const logoUrl = settings.logoUrl || `${BASE_URL}/logo.png`;
  const siteName = settings.siteName || 'PINLY';
  
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0b0d; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #12151a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); text-align: center;">
              <img src="${logoUrl}" alt="${siteName}" style="height: 48px; margin-bottom: 12px;" onerror="this.style.display='none'">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">${siteName}</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #ffffff; line-height: 1.3;">
                ${content.title}
              </h2>
              
              <div style="font-size: 15px; line-height: 1.7; color: #a1a1aa;">
                ${content.body}
              </div>
              
              ${content.cta ? `
              <div style="margin-top: 32px; text-align: center;">
                <a href="${content.cta.url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
                  ${content.cta.text}
                </a>
              </div>
              ` : ''}
              
              ${content.codes ? `
              <div style="margin-top: 32px; padding: 24px; background-color: #1e2229; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">
                  🎁 Teslim Edilen Kodlar
                </h3>
                ${content.codes.map(code => `
                <div style="margin-bottom: 12px; padding: 16px; background-color: #12151a; border-radius: 8px; border: 1px dashed rgba(59, 130, 246, 0.5);">
                  <code style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 16px; color: #60a5fa; word-break: break-all; letter-spacing: 1px;">
                    ${code}
                  </code>
                </div>
                `).join('')}
                <p style="margin: 16px 0 0 0; font-size: 12px; color: #f87171;">
                  ⚠️ Bu kodları kimseyle paylaşmayın. Güvenliğiniz için saklayın.
                </p>
              </div>
              ` : ''}
              
              ${content.info ? `
              <div style="margin-top: 24px; padding: 20px; background-color: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 14px; color: #93c5fd;">
                  ${content.info}
                </p>
              </div>
              ` : ''}
              
              ${content.warning ? `
              <div style="margin-top: 24px; padding: 20px; background-color: rgba(239, 68, 68, 0.1); border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; font-size: 14px; color: #fca5a5;">
                  ⚠️ ${content.warning}
                </p>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0a0b0d; border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a; text-align: center;">
                ${siteName} - Güvenilir UC Satış Platformu
              </p>
              <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                <a href="${BASE_URL}/legal/terms" style="color: #52525b; text-decoration: none;">Kullanım Şartları</a>
                &nbsp;•&nbsp;
                <a href="${BASE_URL}/legal/privacy" style="color: #52525b; text-decoration: none;">Gizlilik Politikası</a>
                &nbsp;•&nbsp;
                <a href="${BASE_URL}/account/support" style="color: #52525b; text-decoration: none;">Destek</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
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
    
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to,
      subject: content.subject,
      html
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
    subject: `Hoş geldin, ${user.firstName}! 🎮`,
    title: `Merhaba ${user.firstName}!`,
    body: `
      <p>PINLY ailesine hoş geldin!</p>
      <p>Hesabın başarıyla oluşturuldu. Artık en uygun fiyatlarla UC satın alabilir ve anında teslimat alabilirsin.</p>
      <p style="margin-top: 20px;">
        <strong>Hesap Bilgilerin:</strong><br>
        📧 E-posta: ${user.email}<br>
        📱 Telefon: ${user.phone}
      </p>
    `,
    cta: {
      text: 'Alışverişe Başla',
      url: BASE_URL
    },
    info: 'Sorularınız için destek talebi oluşturabilirsiniz.'
  };
  
  return sendEmail(db, 'welcome', user.email, content, user.id);
}

async function sendOrderCreatedEmail(db, order, user, product) {
  const content = {
    subject: `Siparişiniz alındı — #${order.id.slice(-8)}`,
    title: 'Siparişiniz Alındı! 🛒',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Siparişiniz başarıyla oluşturuldu. Ödeme işlemini tamamladıktan sonra teslimat yapılacaktır.</p>
      
      <div style="margin-top: 24px; padding: 20px; background-color: #1e2229; border-radius: 8px;">
        <h4 style="margin: 0 0 16px 0; color: #fbbf24;">Sipariş Detayları</h4>
        <table style="width: 100%; font-size: 14px; color: #a1a1aa;">
          <tr><td style="padding: 8px 0;">Sipariş No:</td><td style="text-align: right; color: #fff;">#${order.id.slice(-8)}</td></tr>
          <tr><td style="padding: 8px 0;">Ürün:</td><td style="text-align: right; color: #fff;">${product.name}</td></tr>
          <tr><td style="padding: 8px 0;">UC Miktarı:</td><td style="text-align: right; color: #60a5fa;">${product.ucAmount} UC</td></tr>
          <tr><td style="padding: 8px 0;">Oyuncu ID:</td><td style="text-align: right; color: #fff;">${order.playerId}</td></tr>
          <tr><td style="padding: 8px 0;">Oyuncu Adı:</td><td style="text-align: right; color: #fff;">${order.playerName}</td></tr>
          <tr style="border-top: 1px solid rgba(255,255,255,0.1);"><td style="padding: 16px 0 8px 0; font-weight: 600; color: #fff;">Toplam:</td><td style="text-align: right; font-size: 18px; font-weight: 700; color: #22c55e;">${product.price.toFixed(2)} TL</td></tr>
        </table>
      </div>
    `,
    cta: {
      text: 'Siparişi Görüntüle',
      url: `${BASE_URL}/account/orders/${order.id}`
    },
    info: 'Ödeme sayfasına yönlendirildiniz. Ödeme tamamlandıktan sonra teslimat otomatik yapılacaktır.'
  };
  
  return sendEmail(db, 'order_created', user.email, content, user.id, order.id);
}

async function sendPaymentSuccessEmail(db, order, user, product) {
  const content = {
    subject: `Ödemeniz alındı — #${order.id.slice(-8)}`,
    title: 'Ödeme Başarılı! ✅',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Ödemeniz başarıyla alındı! Siparişiniz işleme alındı ve teslimat hazırlanıyor.</p>
      
      <div style="margin-top: 24px; padding: 20px; background-color: #1e2229; border-radius: 8px;">
        <table style="width: 100%; font-size: 14px; color: #a1a1aa;">
          <tr><td style="padding: 8px 0;">Sipariş No:</td><td style="text-align: right; color: #fff;">#${order.id.slice(-8)}</td></tr>
          <tr><td style="padding: 8px 0;">Ürün:</td><td style="text-align: right; color: #fff;">${product.name}</td></tr>
          <tr><td style="padding: 8px 0;">Ödenen Tutar:</td><td style="text-align: right; color: #22c55e;">${product.price.toFixed(2)} TL</td></tr>
        </table>
      </div>
    `,
    cta: {
      text: 'Sipariş Durumunu Kontrol Et',
      url: `${BASE_URL}/account/orders/${order.id}`
    },
    info: 'Teslimat tamamlandığında size tekrar bilgi vereceğiz.'
  };
  
  return sendEmail(db, 'paid', user.email, content, user.id, order.id);
}

async function sendDeliveredEmail(db, order, user, product, codes) {
  const content = {
    subject: `Teslimat tamamlandı — #${order.id.slice(-8)}`,
    title: 'Teslimat Tamamlandı! 🎉',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Harika haber! Siparişiniz başarıyla teslim edildi. Aşağıda UC kodlarınızı bulabilirsiniz.</p>
      
      <div style="margin-top: 20px; padding: 16px; background-color: #1e2229; border-radius: 8px;">
        <table style="width: 100%; font-size: 14px; color: #a1a1aa;">
          <tr><td style="padding: 6px 0;">Ürün:</td><td style="text-align: right; color: #fff;">${product.name}</td></tr>
          <tr><td style="padding: 6px 0;">UC Miktarı:</td><td style="text-align: right; color: #60a5fa;">${product.ucAmount} UC</td></tr>
          <tr><td style="padding: 6px 0;">Oyuncu:</td><td style="text-align: right; color: #fff;">${order.playerName} (${order.playerId})</td></tr>
        </table>
      </div>
    `,
    codes: codes,
    cta: {
      text: 'Sipariş Detaylarını Gör',
      url: `${BASE_URL}/account/orders/${order.id}`
    },
    warning: 'Bu kodları kimseyle paylaşmayın! Kodlar tek kullanımlıktır.'
  };
  
  return sendEmail(db, 'delivered', user.email, content, user.id, order.id);
}

async function sendPendingStockEmail(db, order, user, product, message) {
  const content = {
    subject: `Stok bekleniyor — #${order.id.slice(-8)}`,
    title: 'Siparişiniz Beklemede 📦',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Ödemeniz alındı ancak şu anda bu ürün için stok bulunmamaktadır.</p>
      <p><strong>Durum:</strong> ${message || 'Stok bekleniyor'}</p>
      
      <div style="margin-top: 20px; padding: 16px; background-color: #1e2229; border-radius: 8px;">
        <table style="width: 100%; font-size: 14px; color: #a1a1aa;">
          <tr><td style="padding: 6px 0;">Sipariş No:</td><td style="text-align: right; color: #fff;">#${order.id.slice(-8)}</td></tr>
          <tr><td style="padding: 6px 0;">Ürün:</td><td style="text-align: right; color: #fff;">${product.name}</td></tr>
        </table>
      </div>
    `,
    cta: {
      text: 'Sipariş Durumunu Takip Et',
      url: `${BASE_URL}/account/orders/${order.id}`
    },
    info: 'Stok geldiğinde siparişiniz otomatik olarak teslim edilecek ve size bilgi verilecektir.'
  };
  
  return sendEmail(db, 'pending', user.email, content, user.id, order.id);
}

async function sendSupportReplyEmail(db, ticket, user, adminMessage) {
  const preview = adminMessage.length > 200 ? adminMessage.substring(0, 200) + '...' : adminMessage;
  
  const content = {
    subject: `Destek talebinize yanıt var — #${ticket.id.slice(-8)}`,
    title: 'Destek Ekibinden Yanıt 💬',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Destek talebinize yanıt verildi.</p>
      
      <div style="margin-top: 20px; padding: 20px; background-color: #1e2229; border-radius: 8px;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #71717a; text-transform: uppercase;">Talep: ${ticket.subject}</p>
        <div style="padding: 16px; background-color: #12151a; border-radius: 8px; border-left: 3px solid #22c55e;">
          <p style="margin: 0; font-size: 14px; color: #d4d4d8; line-height: 1.6;">
            "${preview}"
          </p>
        </div>
      </div>
    `,
    cta: {
      text: 'Yanıtı Görüntüle',
      url: `${BASE_URL}/account/support/${ticket.id}`
    },
    info: 'Artık siz de yanıt verebilirsiniz.'
  };
  
  // Support replies can be multiple, so skip duplicate check
  return sendEmail(db, 'support_reply', user.email, content, user.id, null, ticket.id, true);
}

async function sendPasswordChangedEmail(db, user) {
  const content = {
    subject: 'Şifreniz değiştirildi ⚠️',
    title: 'Şifre Değişikliği Bildirimi',
    body: `
      <p>Merhaba ${user.firstName},</p>
      <p>Hesabınızın şifresi başarıyla değiştirildi.</p>
      
      <div style="margin-top: 20px; padding: 16px; background-color: #1e2229; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #a1a1aa;">
          📅 Tarih: ${new Date().toLocaleString('tr-TR')}<br>
          📧 Hesap: ${user.email}
        </p>
      </div>
    `,
    warning: 'Bu işlemi siz yapmadıysanız, hemen destek ekibiyle iletişime geçin!',
    cta: {
      text: 'Destek Talebi Oluştur',
      url: `${BASE_URL}/account/support/new`
    }
  };
  
  // Password change emails should always send (skip duplicate)
  return sendEmail(db, 'password_changed', user.email, content, user.id, null, null, true);
}

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
      const riskStatus = searchParams.get('riskStatus'); // FLAGGED | CLEAR
      const deliveryStatus = searchParams.get('deliveryStatus'); // hold | pending | delivered
      
      let query = {};
      if (status) query.status = status;
      if (riskStatus) query['risk.status'] = riskStatus;
      if (deliveryStatus) query['delivery.status'] = deliveryStatus;
      
      const orders = await db.collection('orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      // Get user details for each order
      const userIds = [...new Set(orders.map(o => o.userId).filter(Boolean))];
      const users = await db.collection('users').find({ id: { $in: userIds } }).toArray();
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u; });
      
      // Enrich orders with user info
      const enrichedOrders = orders.map(order => {
        const user = userMap[order.userId];
        return {
          ...order,
          userEmail: user?.email || null,
          userPhone: user?.phone || null,
          userName: user?.name || user?.email?.split('@')[0] || null
        };
      });
      
      // Add flagged count for badge
      const flaggedCount = await db.collection('orders').countDocuments({ 
        'risk.status': 'FLAGGED',
        'delivery.status': 'hold'
      });
      
      return NextResponse.json({ 
        success: true, 
        data: enrichedOrders,
        meta: { flaggedCount }
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
      
      // Get site base URL for display
      const siteSettings = await db.collection('site_settings').findOne({ active: true });
      const baseUrl = siteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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
      const seoSettings = await db.collection('seo_settings').findOne({ active: true });

      return NextResponse.json({
        success: true,
        data: {
          ga4MeasurementId: seoSettings?.enableAnalytics ? seoSettings.ga4MeasurementId : null,
          gscVerificationCode: seoSettings?.enableSearchConsole ? seoSettings.gscVerificationCode : null
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

    // Public: Get site settings (for frontend)
    if (pathname === '/api/site/settings') {
      const settings = await db.collection('site_settings').findOne({ active: true });
      
      return NextResponse.json({
        success: true,
        data: {
          logo: settings?.logo || null,
          favicon: settings?.favicon || null,
          heroImage: settings?.heroImage || null,
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
        }
      });
    }

    // Public: Get daily banner settings
    if (pathname === '/api/site/banner') {
      const settings = await db.collection('site_settings').findOne({ active: true });
      
      return NextResponse.json({
        success: true,
        data: {
          enabled: settings?.dailyBannerEnabled !== false,
          title: settings?.dailyBannerTitle || 'Bugüne Özel Fiyatlar',
          subtitle: settings?.dailyBannerSubtitle || '',
          icon: settings?.dailyBannerIcon || 'fire',
          countdownEnabled: settings?.dailyCountdownEnabled !== false,
          countdownLabel: settings?.dailyCountdownLabel || 'Kampanya bitimine'
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
    
    // For all other endpoints, parse JSON body
    const body = await request.json();

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
          subject: '🧪 Test E-postası - PINLY',
          title: 'Test E-postası Başarılı!',
          body: `
            <p>Merhaba,</p>
            <p>Bu bir test e-postasıdır. E-posta sisteminiz doğru yapılandırılmış ve çalışıyor!</p>
            <p><strong>SMTP Bilgileri:</strong></p>
            <ul style="color: #a1a1aa;">
              <li>Host: ${settings.smtpHost}</li>
              <li>Port: ${settings.smtpPort}</li>
              <li>Güvenli: ${settings.smtpSecure ? 'Evet' : 'Hayır'}</li>
              <li>Gönderen: ${settings.fromEmail}</li>
            </ul>
            <p style="margin-top: 20px; color: #22c55e;">✅ E-posta sistemi çalışıyor!</p>
          `,
          info: 'Bu e-posta admin panelinden gönderilen bir test mesajıdır.'
        };

        const html = generateEmailTemplate(testContent, {
          logoUrl: siteSettings?.logoUrl,
          siteName: siteSettings?.siteName || 'PINLY'
        });

        await transporter.sendMail({
          from: `"${settings.fromName}" <${settings.fromEmail}>`,
          to: settings.testRecipientEmail,
          subject: testContent.subject,
          html
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
      // Get OAuth settings from database or .env
      const oauthSettings = await db.collection('oauth_settings').findOne({ provider: 'google' });
      
      let clientId, redirectUri;
      
      if (oauthSettings?.clientId) {
        clientId = decrypt(oauthSettings.clientId);
        const siteSettings = await db.collection('site_settings').findOne({ active: true });
        const baseUrl = siteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        redirectUri = `${baseUrl}/api/auth/google/callback`;
      } else if (process.env.GOOGLE_CLIENT_ID) {
        clientId = process.env.GOOGLE_CLIENT_ID;
        redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;
      } else {
        return NextResponse.redirect(new URL('/?google_auth=error&reason=oauth_not_configured', request.url));
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
      
      const siteSettings = await db.collection('site_settings').findOne({ active: true });
      const baseUrl = siteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      if (error) {
        return NextResponse.redirect(new URL(`/?google_auth=error&reason=google_auth_denied`, baseUrl));
      }
      
      if (!code) {
        return NextResponse.redirect(new URL(`/?google_auth=error&reason=no_code`, baseUrl));
      }
      
      try {
        // Get OAuth settings
        const oauthSettings = await db.collection('oauth_settings').findOne({ provider: 'google' });
        
        let clientId, clientSecret, redirectUri;
        
        if (oauthSettings?.clientId && oauthSettings?.clientSecret) {
          clientId = decrypt(oauthSettings.clientId);
          clientSecret = decrypt(oauthSettings.clientSecret);
          redirectUri = `${baseUrl}/api/auth/google/callback`;
        } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
          clientId = process.env.GOOGLE_CLIENT_ID;
          clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`;
        } else {
          return NextResponse.redirect(new URL(`/?google_auth=error&reason=oauth_config_error`, baseUrl));
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
      const shopierPayload = {
        API_key: apiKey, // Note: API_key not api_key
        website_index: 1,
        platform_order_id: order.id,
        product_name: `PINLY - ${product.title}`,
        product_type: 1, // 0 = Physical, 1 = Digital
        buyer_name: customerSnapshot.firstName,
        buyer_surname: customerSnapshot.lastName,
        buyer_email: customerSnapshot.email,
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

      // 11. CALCULATE RISK & AUTO-ASSIGN STOCK (if PAID and not already assigned)
      if (newStatus === 'paid') {
        // Get user and product for email
        const orderUser = await db.collection('users').findOne({ id: order.userId });
        const product = await db.collection('products').findOne({ id: order.productId });

        // Calculate risk score
        const riskResult = await calculateOrderRisk(db, order, orderUser, request);
        
        // Update order with risk information
        await db.collection('orders').updateOne(
          { id: order.id },
          {
            $set: {
              risk: riskResult,
              'meta.ip': getClientIP(request)
            }
          }
        );

        // If FLAGGED - HOLD delivery, don't assign stock
        if (riskResult.status === 'FLAGGED') {
          await db.collection('orders').updateOne(
            { id: order.id },
            {
              $set: {
                delivery: {
                  status: 'hold',
                  message: 'Sipariş kontrol altında',
                  holdReason: 'risk_flagged',
                  items: []
                }
              }
            }
          );
          
          // Log the risk flag
          await logAuditAction(db, AUDIT_ACTIONS.ORDER_RISK_FLAG, 'system', 'order', order.id, request, {
            riskScore: riskResult.score,
            reasons: riskResult.reasons
          });
          
          console.log(`Order ${order.id} FLAGGED with risk score ${riskResult.score}. Delivery on HOLD.`);
          
          // Send payment success email (but note delivery is pending review)
          if (orderUser && product) {
            sendPaymentSuccessEmail(db, order, orderUser, product).catch(err => 
              console.error('Payment success email failed:', err)
            );
          }
        } else {
          // CLEAR risk - proceed with stock assignment
          // Send payment success email
          if (orderUser && product) {
            sendPaymentSuccessEmail(db, order, orderUser, product).catch(err => 
              console.error('Payment success email failed:', err)
            );
          }

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
                
                // Send delivered email with codes
                if (orderUser && product) {
                  sendDeliveredEmail(db, order, orderUser, product, [stockCode]).catch(err => 
                    console.error('Delivered email failed:', err)
                  );
                }
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
                
                // Send pending stock email
                if (orderUser && product) {
                  sendPendingStockEmail(db, order, orderUser, product, 'Stok bekleniyor').catch(err => 
                    console.error('Pending stock email failed:', err)
                  );
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

      const { logo, favicon, heroImage, categoryIcon, siteName, metaTitle, metaDescription, contactEmail, contactPhone, dailyBannerEnabled, dailyBannerTitle, dailyBannerSubtitle, dailyBannerIcon, dailyCountdownEnabled, dailyCountdownLabel } = body;

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
      
      // Get site base URL for display
      const siteSettings = await db.collection('site_settings').findOne({ active: true });
      const baseUrl = siteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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

      // Send password changed email
      sendPasswordChangedEmail(db, user).catch(err => 
        console.error('Password changed email failed:', err)
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