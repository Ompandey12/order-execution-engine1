import IORedis from 'ioredis';
import { env } from './env';

export const redis = new IORedis(env.redisUrl, {
  // Required by BullMQ to avoid blocking behavior:
  maxRetriesPerRequest: null,
  // Optional: tune connection keepalive / retry strategy if you want
  enableOfflineQueue: true
});
