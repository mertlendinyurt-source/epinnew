import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get or generate master encryption key from environment
 * CRITICAL: This key must be kept secret and stored only in .env
 */
function getMasterKey() {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  
  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY not found in environment variables');
  }
  
  // Ensure key is exactly 32 bytes for AES-256
  const hash = crypto.createHash('sha256');
  hash.update(masterKey);
  return hash.digest();
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {string} - Base64 encoded encrypted data with IV and auth tag
 */
export function encrypt(plaintext) {
  if (!plaintext) {
    return null;
  }

  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'base64'),
      authTag
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string} - Decrypted plaintext
 */
export function decrypt(encryptedData) {
  if (!encryptedData) {
    return null;
  }

  try {
    const key = getMasterKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, encrypted data, and auth tag
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(-AUTH_TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH, -AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask sensitive data for display (show only first 4 and last 4 chars)
 * @param {string} data - Data to mask
 * @returns {string} - Masked data
 */
export function maskSensitiveData(data) {
  if (!data || data.length < 8) {
    return '****';
  }
  
  const first = data.substring(0, 4);
  const last = data.substring(data.length - 4);
  const middle = '*'.repeat(Math.max(4, data.length - 8));
  
  return `${first}${middle}${last}`;
}

/**
 * Generate hash for Shopier callback validation
 * According to Shopier API: data = random_nr + platform_order_id
 * signature = HMAC-SHA256(data, apiSecret).digest('base64')
 * @param {string} randomNr - Random number from callback
 * @param {string} orderId - Order ID (platform_order_id)
 * @param {string} secret - Shopier API secret
 * @returns {string} - Base64 encoded HMAC-SHA256 hash
 */
export function generateShopierHash(randomNr, orderId, secret) {
  const data = `${randomNr}${orderId}`;
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

/**
 * Mask data in logs to prevent sensitive data leakage
 * @param {any} obj - Object to log
 * @returns {any} - Object with masked sensitive fields
 */
export function maskForLogs(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const masked = { ...obj };
  const sensitiveFields = ['apiKey', 'apiSecret', 'merchantId', 'password', 'secret', 'token'];
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }
  
  return masked;
}