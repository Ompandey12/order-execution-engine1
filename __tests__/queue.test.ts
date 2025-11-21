import { orderQueue, enqueueOrder } from '../src/queue/orderQueue';

describe('Order queue', () => {
  it('enqueues a job with correct data', async () => {
    const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);
    await enqueueOrder('order-123');
    expect(addSpy).toHaveBeenCalledWith(
      'execute',
      { orderId: 'order-123' },
      expect.objectContaining({
        attempts: 3
      })
    );
    addSpy.mockRestore();
  });
});
