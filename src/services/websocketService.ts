// src/services/websocketService.ts
import { FastifyInstance } from 'fastify';
import * as redisModule from '../config/redis';
import { logger } from '../utils/logger';

type WS = any;

/**
 * Resolve redis client similar to eventEmitter so this file works whether you export
 * `getRedis()` or `redis`.
 */
function resolveRedisClient(): any {
  if (typeof (redisModule as any).getRedis === 'function') return (redisModule as any).getRedis();
  if ((redisModule as any).redis) return (redisModule as any).redis;
  if ((redisModule as any).default) return (redisModule as any).default;
  throw new Error('Redis client not found in ../config/redis');
}

// Map orderId -> set of websocket clients
export const orderSocketMap = new Map<string, Set<WS>>();

/**
 * Broadcast a payload (object or string) to all sockets subscribed to orderId.
 */
export function broadcastToOrderSockets(orderId: string, payload: any) {
  const set = orderSocketMap.get(orderId);
  if (!set || set.size === 0) return;
  const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const ws of Array.from(set)) {
    try {
      if (typeof ws.send === 'function') {
        ws.send(msg);
      } else if (typeof ws.write === 'function') {
        ws.write(msg);
      }
    } catch (err) {
      // remove faulty socket
      try { set.delete(ws); } catch { }
      logger.warn('broadcastToOrderSockets: send failed', { orderId, err: String(err) });
    }
  }
}

/**
 * Registers websocket routes on Fastify instance.
 * Call this during bootstrap: await registerWebsocketRoutes(app);
 */
export default async function registerWebsocketRoutes(app: FastifyInstance) {
  app.get('/ws/orders/:orderId', { websocket: true }, async (connection /* SocketStream */, req: any) => {
    try {
      const ws = connection.socket as WS;
      // Handle both req.params and direct params access
      const orderId = (req.params?.orderId || req.params) as string;

      if (!orderId || typeof orderId !== 'string' || orderId === 'undefined') {
        logger.error('WebSocket connection failed: missing orderId', { params: req.params });
        // Just return without closing - connection will handle itself
        return;
      }

      logger.info('WebSocket connected for order', { orderId });

      // add socket to map
      let set = orderSocketMap.get(orderId);
      if (!set) {
        set = new Set<WS>();
        orderSocketMap.set(orderId, set);
      }
      set.add(ws);

      // cleanup on close
      ws.on('close', () => {
        try { set!.delete(ws); } catch { }
        if (set && set.size === 0) orderSocketMap.delete(orderId);
        logger.info('WebSocket closed for order', { orderId });
      });

      // replay history from redis then fallback to active_orders snapshot
      (async () => {
        try {
          const redis = resolveRedisClient();
          const key = `order:events:${orderId}`;
          const events = await redis.lrange(key, 0, -1); // array of JSON strings
          if (events && events.length > 0) {
            for (const e of events) {
              try { ws.send(e); } catch (err) { logger.warn('WS replay send failed', { orderId, err: String(err) }); }
            }
          } else {
            // fallback to active_orders snapshot if present
            try {
              const raw = await redis.hget('active_orders', orderId);
              if (raw) {
                const snapshot = JSON.parse(raw);
                ws.send(JSON.stringify({ orderId, status: snapshot.status, data: snapshot }));
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (err) {
          logger.warn('WS: replay history failed', { orderId, err: String(err) });
        }
      })();

      // no-op incoming message handler (keeps socket alive)
      ws.on('message', (_msg: any) => { });
    } catch (error) {
      logger.error('WebSocket connection error', { error: String(error) });
      // Don't throw - just log and close gracefully
    }
  });
}
