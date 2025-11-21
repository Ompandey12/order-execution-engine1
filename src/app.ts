import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { registerOrderRoutes } from './routes/orders';
import { logger } from './utils/logger';
import registerWebsocketRoutes from './services/websocketService';

export async function buildApp() {
  const app = Fastify({
    logger: false
  });

  await app.register(websocketPlugin);
  await app.register(registerOrderRoutes);
  await registerWebsocketRoutes(app);

  app.get('/health', async () => ({ status: 'ok' }));

  app.setErrorHandler((error, request, reply) => {
    logger.error('Unhandled error', { error: error.message });
    reply.status((error as any).statusCode || 500).send({
      error: error.message || 'Internal Server Error'
    });
  });

  return app;
}
