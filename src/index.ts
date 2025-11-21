import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { createOrderWorker } from './queue/orderQueue';

async function main() {
  const app = await buildApp();

  createOrderWorker();

  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
    logger.info(`Server running on http://localhost:${env.port}`);
  } catch (err) {
    logger.error('Failed to start server', { error: (err as any).message });
    process.exit(1);
  }
}

main();
