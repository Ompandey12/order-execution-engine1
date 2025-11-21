// src/routes/orders.ts
import { FastifyInstance } from 'fastify';
import { createMarketOrder } from '../services/orderService';
import { enqueueOrder } from '../queue/orderQueue';
import { logger } from '../utils/logger';

export async function registerOrderRoutes(app: FastifyInstance) {
  app.post('/api/orders/execute', async (request, reply) => {
    const body = request.body as any;

    const { baseToken, quoteToken, side, amountIn, slippageBps } = body ?? {};

    if (!baseToken || !quoteToken || !side || typeof amountIn !== 'number') {
      return reply.status(400).send({
        error: 'baseToken, quoteToken, side, amountIn are required'
      });
    }

    if (side !== 'buy' && side !== 'sell') {
      return reply.status(400).send({ error: 'side must be buy or sell' });
    }

    const order = await createMarketOrder({
      baseToken,
      quoteToken,
      side,
      amountIn,
      slippageBps
    });

    await enqueueOrder(order.id);

    return reply.status(201).send({
      orderId: order.id,
      status: order.status,
      wsUrl: `/ws/orders/${order.id}`
    });
  });

  app.get('/api/orders/:id', async (request, reply) => {
    // Optional convenience endpoint (could be implemented to query DB)
    return reply.status(501).send({ error: 'Not implemented in mock' });
  });
}
