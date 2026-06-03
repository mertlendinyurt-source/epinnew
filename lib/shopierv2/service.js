/**
 * Shopier V2 Service Layer
 * Handles business logic and database operations for Shopier V2 payments
 */

import { v4 as uuidv4 } from 'uuid';
import * as shopierClient from './client.js';

/**
 * Create or get session for Shopier V2 payment
 * @param {Object} db - MongoDB database instance
 * @param {Object} order - Order details
 * @param {Object} customer - Customer details
 * @returns {Promise<Object>} Session with payment URL
 */
export async function createPaymentSession(db, order, customer) {
  // Check if session already exists
  const existingSession = await db.collection('shopierv2_sessions').findOne({
    orderId: order.id,
    status: { $in: ['pending', 'active'] },
  });

  if (existingSession && existingSession.expiresAt > new Date()) {
    console.log('Shopier V2: Existing session found:', existingSession.sessionId);
    return {
      success: true,
      sessionId: existingSession.sessionId,
      paymentUrl: existingSession.paymentUrl,
      shopierOrderId: existingSession.shopierOrderId,
    };
  }

  // Create new checkout
  const checkoutResult = await shopierClient.createCheckout(order, customer);

  if (!checkoutResult.success) {
    return checkoutResult;
  }

  // Save session to database
  const session = {
    sessionId: uuidv4(),
    orderId: order.id,
    userId: customer.userId || order.userId,
    shopierOrderId: checkoutResult.orderId,
    reference: checkoutResult.reference,
    paymentUrl: checkoutResult.paymentUrl,
    amount: order.amount,
    currency: 'TRY',
    status: 'pending', // pending -> active -> paid -> completed / failed / cancelled
    expiresAt: checkoutResult.expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('shopierv2_sessions').insertOne(session);

  console.log('Shopier V2: New session created:', session.sessionId);

  return {
    success: true,
    sessionId: session.sessionId,
    paymentUrl: session.paymentUrl,
    shopierOrderId: session.shopierOrderId,
  };
}

/**
 * Get session status
 * @param {Object} db - MongoDB database instance
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Session status
 */
export async function getSessionStatus(db, orderId) {
  const session = await db.collection('shopierv2_sessions').findOne({
    orderId: orderId,
  }, {
    sort: { createdAt: -1 },
  });

  if (!session) {
    return {
      success: false,
      error: 'Ödeme oturumu bulunamadı',
    };
  }

  // Check if session expired
  if (session.expiresAt < new Date() && session.status === 'pending') {
    await db.collection('shopierv2_sessions').updateOne(
      { sessionId: session.sessionId },
      {
        $set: {
          status: 'expired',
          updatedAt: new Date(),
        },
      }
    );
    
    return {
      success: true,
      status: 'expired',
      message: 'Ödeme oturumu süresi doldu',
    };
  }

  return {
    success: true,
    status: session.status,
    shopierOrderId: session.shopierOrderId,
    paymentUrl: session.paymentUrl,
    expiresAt: session.expiresAt,
  };
}

/**
 * Update session status based on webhook callback
 * @param {Object} db - MongoDB database instance
 * @param {Object} webhookData - Webhook payload from Shopier
 * @returns {Promise<Object>} Update result
 */
export async function handleWebhookCallback(db, webhookData) {
  const { order_id, reference, status, amount, currency } = webhookData;

  // Find session by Shopier order ID or reference
  const session = await db.collection('shopierv2_sessions').findOne({
    $or: [
      { shopierOrderId: order_id },
      { reference: reference },
    ],
  });

  if (!session) {
    console.error('Shopier V2 Webhook: Session not found for order:', order_id);
    return {
      success: false,
      error: 'Ödeme oturumu bulunamadı',
    };
  }

  // Map Shopier status to internal status
  let internalStatus = session.status;
  let shouldUpdateOrder = false;

  switch (status) {
    case 'paid':
    case 'payment_completed':
      internalStatus = 'paid';
      shouldUpdateOrder = true;
      break;
    case 'failed':
    case 'payment_failed':
      internalStatus = 'failed';
      shouldUpdateOrder = true;
      break;
    case 'cancelled':
    case 'payment_cancelled':
      internalStatus = 'cancelled';
      shouldUpdateOrder = true;
      break;
    case 'pending':
    case 'awaiting_payment':
      internalStatus = 'active';
      break;
    default:
      console.warn('Shopier V2: Unknown status:', status);
      internalStatus = 'unknown';
  }

  // Update session
  await db.collection('shopierv2_sessions').updateOne(
    { sessionId: session.sessionId },
    {
      $set: {
        status: internalStatus,
        webhookData: webhookData,
        webhookReceivedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  console.log('Shopier V2 Webhook: Session updated:', {
    sessionId: session.sessionId,
    orderId: session.orderId,
    status: internalStatus,
  });

  // Update order status if needed
  if (shouldUpdateOrder) {
    const order = await db.collection('orders').findOne({ id: session.orderId });
    
    if (order) {
      let orderStatus = order.status;
      
      if (internalStatus === 'paid') {
        orderStatus = 'paid';
      } else if (internalStatus === 'failed') {
        orderStatus = 'failed';
      } else if (internalStatus === 'cancelled') {
        orderStatus = 'cancelled';
      }

      await db.collection('orders').updateOne(
        { id: session.orderId },
        {
          $set: {
            status: orderStatus,
            paidAt: internalStatus === 'paid' ? new Date() : order.paidAt,
            updatedAt: new Date(),
            'meta.shopierV2OrderId': order_id,
            'meta.shopierV2Status': status,
          },
        }
      );

      console.log('Shopier V2 Webhook: Order updated:', {
        orderId: session.orderId,
        orderStatus: orderStatus,
      });
    }
  }

  return {
    success: true,
    sessionId: session.sessionId,
    orderId: session.orderId,
    status: internalStatus,
  };
}

/**
 * Close order in Shopier after successful delivery (with delay)
 * @param {Object} db - MongoDB database instance
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Close result
 */
export async function closeOrderAfterDelivery(db, orderId) {
  const session = await db.collection('shopierv2_sessions').findOne({
    orderId: orderId,
    status: 'paid',
  });

  if (!session) {
    console.log('Shopier V2: No paid session found for order:', orderId);
    return {
      success: false,
      error: 'Ödeme oturumu bulunamadı',
    };
  }

  // Check if already closed
  if (session.closedAt) {
    console.log('Shopier V2: Order already closed:', orderId);
    return {
      success: true,
      message: 'Sipariş zaten kapatılmış',
    };
  }

  // Close delay: wait before closing (configured via env)
  const closeDelay = parseInt(process.env.SHOPIER_V2_CLOSE_DELAY) || 60;
  const deliveredAt = new Date();
  const closeAt = new Date(deliveredAt.getTime() + closeDelay * 1000);

  // Schedule close (in real implementation, use a job queue)
  // For now, we'll close immediately and log
  console.log(`Shopier V2: Closing order after ${closeDelay} seconds:`, orderId);

  const closeResult = await shopierClient.closeOrder(session.shopierOrderId);

  if (closeResult.success) {
    await db.collection('shopierv2_sessions').updateOne(
      { sessionId: session.sessionId },
      {
        $set: {
          status: 'completed',
          closedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log('Shopier V2: Order closed successfully:', orderId);
  }

  return closeResult;
}

/**
 * Cleanup expired sessions (cron job helper)
 * @param {Object} db - MongoDB database instance
 * @returns {Promise<number>} Number of cleaned sessions
 */
export async function cleanupExpiredSessions(db) {
  const result = await db.collection('shopierv2_sessions').updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() },
    },
    {
      $set: {
        status: 'expired',
        updatedAt: new Date(),
      },
    }
  );

  console.log('Shopier V2: Cleaned up expired sessions:', result.modifiedCount);
  return result.modifiedCount;
}
