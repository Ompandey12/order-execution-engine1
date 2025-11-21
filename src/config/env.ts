import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/order_engine',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  logLevel: (process.env.LOG_LEVEL || 'info') as 'info' | 'debug' | 'error'
};
