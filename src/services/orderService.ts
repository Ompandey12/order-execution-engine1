// src/services/orderService.ts
import { v4 as uuidv4 } from 'uuid';
import * as redisModule from '../config/redis';
import { logger } from '../utils/logger';
import { Order, OrderStatus } from '../models/order';
import { createOrder, getOrderById, updateOrder } from './orderRepository';
import { MockDexRouter } from './dexRouter';
import { emitAndStore } from './eventEmitter';

const ACTIVE_ORDERS_KEY = 'active_orders';
const dexRouter = new MockDexRouter();

export interface CreateMarketOrderInput {
  baseToken: string;
  quoteToken: string;
  side: 'buy' | 'sell';
  amountIn: number;
  slippageBps?: number;
}

function resolveRedisClient(): any {
  if (typeof (redisModule as any).getRedis === 'function') return (redisModule as any).getRedis();
  if ((redisModule as any).redis) return (redisModule as any).redis;
  if ((redisModule as any).default) return (redisModule as any).default;
  throw new Error('Redis client not found in ../config/redis');
}

export async function createMarketOrder(input: CreateMarketOrderInput): Promise<Order> {
  const id = uuidv4();
  const now = new Date();

  const order: Order = {
    id,
    type: 'market',
    baseToken: input.baseToken,
    quoteToken: input.quoteToken,
    side: input.side,
    amountIn: input.amountIn,
    slippageBps: input.slippageBps ?? 100, // 1%
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };

  await createOrder(order);

  // store a lightweight snapshot in redis active_orders
  try {
    const redis = resolveRedisClient();
    await redis.hset(ACTIVE_ORDERS_KEY, order.id, JSON.stringify(order));
  } catch (e) {
    logger.warn('createMarketOrder: redis hset failed', { err: String(e) });
  }

  // emit pending (broadcast + store)
  await emitAndStore(order.id, 'pending', { order });

  return order;
}

async function setStatus(orderId: string, status: OrderStatus, data?: Record<string, unknown>) {
  // only update DB columns that exist; updateOrder handles that
  await updateOrder(orderId, { status } as any);
  const updated = await getOrderById(orderId);
  if (updated) {
    try {
      const redis = resolveRedisClient();
      await redis.hset(ACTIVE_ORDERS_KEY, orderId, JSON.stringify(updated));
    } catch (e) {
      logger.warn('setStatus: redis hset failed', { orderId, err: String(e) });
    }
  }
  // use emitAndStore so events are broadcast and stored
  await emitAndStore(orderId, status, data ?? {});
}

export async function processOrder(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) {
    logger.error('Order not found when processing', { orderId });
    await emitAndStore(orderId, 'failed', { error: 'order not found' });
    return;
  }

  try {
    await setStatus(orderId, 'routing');

    const [raydiumQuote, meteoraQuote] = await Promise.all([
      dexRouter.getRaydiumQuote(order.baseToken, order.quoteToken, order.amountIn),
      dexRouter.getMeteoraQuote(order.baseToken, order.quoteToken, order.amountIn)
    ]);

    const best = dexRouter.chooseBestQuote(order.side, raydiumQuote, meteoraQuote);
    logger.info('Selected DEX route', { orderId, bestDex: best.dex });

    await setStatus(orderId, 'building', {
      selectedDex: best.dex,
      quote: best
    });

    const slippageFraction = order.slippageBps / 10_000;
    const minAcceptablePrice =
      order.side === 'sell'
        ? best.price * (1 - slippageFraction)
        : best.price * (1 + slippageFraction);

    await setStatus(orderId, 'submitted', {
      selectedDex: best.dex,
      minAcceptablePrice
    });

    const exec = await dexRouter.executeSwap(best.dex, best.price);

    // update DB with execution details
    await updateOrder(orderId, {
      selectedDex: exec.dex,
      executedPrice: exec.executedPrice,
      txHash: exec.txHash,
      failureReason: null
    } as any);

    await setStatus(orderId, 'confirmed', {
      txHash: exec.txHash,
      executedPrice: exec.executedPrice,
      selectedDex: exec.dex
    });

    // remove from active_orders snapshot
    try {
      const redis = resolveRedisClient();
      await redis.hdel(ACTIVE_ORDERS_KEY, orderId);
    } catch (e) {
      logger.warn('processOrder: redis hdel failed', { orderId, err: String(e) });
    }

    logger.info('Order job completed', { orderId });
  } catch (err: any) {
    logger.error('Order processing failed', { orderId, error: err?.message });
    await setStatus(orderId, 'failed', {
      error: err?.message ?? 'Unknown error'
    });
    try {
      await updateOrder(orderId, {
        failureReason: err?.message ?? 'Unknown error'
      } as any);
    } catch {}
  }
}
