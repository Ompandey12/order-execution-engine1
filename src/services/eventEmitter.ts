// src/services/eventEmitter.ts
import * as redisModule from '../config/redis';
import { broadcastToOrderSockets } from './websocketService';
import { logger } from '../utils/logger';

export interface OrderEvent {
  orderId: string;
  status: string;
  data?: any;
  ts?: string;
}

function resolveRedisClient(): any {
  if (typeof (redisModule as any).getRedis === 'function') return (redisModule as any).getRedis();
  if ((redisModule as any).redis) return (redisModule as any).redis;
  if ((redisModule as any).default) return (redisModule as any).default;
  throw new Error('Redis client not found in ../config/redis');
}

export async function emitAndStore(orderId: string | undefined, status: string, data?: any) {
  // Defensive: check orderId
  if (!orderId) {
    // capture stack to help locate who called it with undefined
    const stack = new Error().stack;
    logger.error('emitAndStore called with undefined orderId', { status, data, stack });
    return;
  }

  const payload: OrderEvent = { orderId, status, data, ts: new Date().toISOString() };

  // 1) broadcast to live sockets (guard payload)
  try {
    broadcastToOrderSockets(orderId, payload);
  } catch (err) {
    logger.warn('emitAndStore: broadcast failed', { orderId, err: String(err) });
  }

  // 2) push to redis history list
  try {
    const redis = resolveRedisClient();
    const key = `order:events:${orderId}`;
    await redis.rpush(key, JSON.stringify(payload));
    await redis.ltrim(key, -50, -1);
  } catch (err) {
    logger.warn('emitAndStore: push to redis failed', { orderId, err: String(err) });
  }

  // 3) debug log
  logger.info('EMIT', { orderId, status, data });
}
