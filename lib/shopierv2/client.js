/**
 * Shopier V2 API Client
 * Handles all communication with Shopier V2 Payment API
 */

import crypto from 'crypto';

const SHOPIER_V2_API_URL = process.env.SHOPIER_V2_API_URL || 'https://payment.shopier.com/v2';
const SHOPIER_V2_API_KEY = process.env.SHOPIER_V2_API_KEY;
const SHOPIER_V2_OSB_USERNAME = process.env.SHOPIER_V2_OSB_USERNAME;
const SHOPIER_V2_OSB_KEY = process.env.SHOPIER_V2_OSB_KEY;
const SHOPIER_V2_REFERENCE_PREFIX = process.env.SHOPIER_V2_REFERENCE_PREFIX || 'SV2';
const SHOPIER_V2_LINK_TTL = parseInt(process.env.SHOPIER_V2_LINK_TTL) || 900;
const SHOPIER_V2_CLOSE_DELAY = parseInt(process.env.SHOPIER_V2_CLOSE_DELAY) || 60;

/**
 * Generate HMAC-SHA256 signature for OSB webhook verification
 * @param {string} data - Data to sign
 * @param {string} key - OSB key
 * @returns {string} Hex signature
 */
export function generateOsbSignature(data, key = SHOPIER_V2_OSB_KEY) {
  return crypto
    .createHmac('sha256', key)
    .update(data)
    .digest('hex');
}

/**
 * Verify OSB webhook signature
 * @param {Object} payload - Webhook payload
 * @returns {boolean} Signature valid or not
 */
export function verifyOsbSignature(payload) {
  const { signature, ...data } = payload;
  
  if (!signature) {
    console.error('Shopier V2: No signature in webhook payload');
    return false;
  }

  // Create verification string from payload (exclude signature field)
  // Order: order_id + reference + amount + currency + status
  const verificationString = `${data.order_id}${data.reference}${data.amount}${data.currency}${data.status}`;
  const expectedSignature = generateOsbSignature(verificationString);

  const isValid = signature === expectedSignature;
  
  if (!isValid) {
    console.error('Shopier V2: Signature mismatch');
    console.error('Expected:', expectedSignature);
    console.error('Received:', signature);
  }

  return isValid;
}

/**
 * Create Shopier V2 Checkout
 * @param {Object} order - Order details
 * @param {Object} customer - Customer details
 * @returns {Promise<Object>} Checkout response with payment_url
 */
export async function createCheckout(order, customer) {
  if (!SHOPIER_V2_API_KEY) {
    throw new Error('Shopier V2 API key not configured');
  }

  const reference = `${SHOPIER_V2_REFERENCE_PREFIX}-${order.id}`;

  // Prepare checkout payload
  const payload = {
    reference: reference,
    amount: parseFloat(order.amount.toFixed(2)),
    currency: 'TRY',
    buyer: {
      name: customer.firstName || 'Müşteri',
      surname: customer.lastName || customer.firstName || 'Müşteri',
      email: customer.email,
      phone: customer.phone?.replace(/[\s\-\(\)\+]/g, '') || '',
    },
    products: [
      {
        name: order.productTitle || 'PUBG UC',
        quantity: order.quantity || 1,
        unit_price: parseFloat(order.amount.toFixed(2)),
        total_price: parseFloat(order.amount.toFixed(2)),
      },
    ],
    link_ttl_seconds: SHOPIER_V2_LINK_TTL,
    close_delay_seconds: SHOPIER_V2_CLOSE_DELAY,
    callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/shopierv2/osb`,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?orderId=${order.id}`,
    fail_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failed?orderId=${order.id}`,
  };

  console.log('Shopier V2 Checkout Request:', {
    ...payload,
    buyer: { ...payload.buyer, email: '***', phone: '***' },
  });

  try {
    const response = await fetch(`${SHOPIER_V2_API_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SHOPIER_V2_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Shopier V2 Checkout Error:', result);
      throw new Error(result.message || 'Ödeme oluşturma hatası');
    }

    console.log('Shopier V2 Checkout Success:', {
      order_id: result.data?.order_id,
      payment_url: result.data?.payment_url?.substring(0, 50) + '...',
    });

    return {
      success: true,
      orderId: result.data.order_id,
      paymentUrl: result.data.payment_url,
      expiresAt: new Date(Date.now() + SHOPIER_V2_LINK_TTL * 1000),
      reference: reference,
    };
  } catch (error) {
    console.error('Shopier V2 Checkout Request Failed:', error);
    return {
      success: false,
      error: error.message || 'Shopier bağlantı hatası',
    };
  }
}

/**
 * Get order status from Shopier V2
 * @param {string} shopierOrderId - Shopier order ID
 * @returns {Promise<Object>} Order status
 */
export async function getOrderStatus(shopierOrderId) {
  if (!SHOPIER_V2_API_KEY) {
    throw new Error('Shopier V2 API key not configured');
  }

  try {
    const response = await fetch(`${SHOPIER_V2_API_URL}/orders/${shopierOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SHOPIER_V2_API_KEY}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Shopier V2 Status Error:', result);
      return {
        success: false,
        error: result.message || 'Sipariş durumu alınamadı',
      };
    }

    return {
      success: true,
      status: result.data.status,
      amount: result.data.amount,
      currency: result.data.currency,
      reference: result.data.reference,
      updatedAt: result.data.updated_at,
    };
  } catch (error) {
    console.error('Shopier V2 Status Request Failed:', error);
    return {
      success: false,
      error: error.message || 'Shopier bağlantı hatası',
    };
  }
}

/**
 * Close order in Shopier V2 (after successful delivery)
 * @param {string} shopierOrderId - Shopier order ID
 * @returns {Promise<Object>} Close result
 */
export async function closeOrder(shopierOrderId) {
  if (!SHOPIER_V2_API_KEY) {
    throw new Error('Shopier V2 API key not configured');
  }

  try {
    const response = await fetch(`${SHOPIER_V2_API_URL}/orders/${shopierOrderId}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SHOPIER_V2_API_KEY}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Shopier V2 Close Order Error:', result);
      return {
        success: false,
        error: result.message || 'Sipariş kapatılamadı',
      };
    }

    console.log('Shopier V2 Order Closed:', shopierOrderId);

    return {
      success: true,
      message: 'Sipariş başarıyla kapatıldı',
    };
  } catch (error) {
    console.error('Shopier V2 Close Request Failed:', error);
    return {
      success: false,
      error: error.message || 'Shopier bağlantı hatası',
    };
  }
}

/**
 * List all orders from Shopier V2 (for admin panel)
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Orders list
 */
export async function listOrders(filters = {}) {
  if (!SHOPIER_V2_API_KEY) {
    throw new Error('Shopier V2 API key not configured');
  }

  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.reference) params.append('reference', filters.reference);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await fetch(`${SHOPIER_V2_API_URL}/orders?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SHOPIER_V2_API_KEY}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Shopier V2 List Orders Error:', result);
      return {
        success: false,
        error: result.message || 'Siparişler alınamadı',
      };
    }

    return {
      success: true,
      orders: result.data.orders || [],
      total: result.data.total || 0,
    };
  } catch (error) {
    console.error('Shopier V2 List Request Failed:', error);
    return {
      success: false,
      error: error.message || 'Shopier bağlantı hatası',
    };
  }
}
