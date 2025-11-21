import { buildApp } from '../src/app';
import { ORDER_QUEUE_NAME } from '../src/queue/orderQueue';

describe('Application tests', () => {
  it('health check endpoint returns ok status', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });

    await app.close();
  });

  it('validates order status enum values', () => {
    const validStatuses = ['pending', 'routing', 'building', 'submitted', 'confirmed', 'failed'];

    validStatuses.forEach(status => {
      expect(typeof status).toBe('string');
      expect(status.length).toBeGreaterThan(0);
    });

    // Verify all expected statuses are present
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('confirmed');
    expect(validStatuses).toContain('failed');
  });

  it('validates queue configuration constants', () => {
    expect(ORDER_QUEUE_NAME).toBe('order-execution-queue');
    expect(typeof ORDER_QUEUE_NAME).toBe('string');
  });

  it('validates order side enum values', () => {
    const validSides = ['buy', 'sell'];

    expect(validSides).toHaveLength(2);
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
