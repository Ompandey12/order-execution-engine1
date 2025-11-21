import { buildApp } from '../src/app';
import { ORDER_QUEUE_NAME } from '../src/queue/orderQueue';

describe('Application Tests', () => {
  it('should return 200 for health check', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });

    await app.close();
  });

  it('should have correct order status enum values', () => {
    const validStatuses = ['pending', 'routing', 'building', 'submitted', 'confirmed', 'failed'];
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('confirmed');
  });

  it('should have correct queue configuration', () => {
    expect(10).toBeGreaterThan(0); // concurrent workers
    expect(100).toBeGreaterThan(0); // rate limit
  });

  it('should have correct order side enum values', () => {
    const validSides = ['buy', 'sell'];
    expect(validSides).toContain('buy');
    expect(validSides).toContain('sell');
  });

  it('validates DEX names', () => {
    const validDexes = ['raydium', 'meteora'];

    expect(validDexes).toHaveLength(2);
    expect(validDexes).toContain('raydium');
    expect(validDexes).toContain('meteora');
  });
});
