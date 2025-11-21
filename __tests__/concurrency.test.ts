import { orderQueue, enqueueOrder, ORDER_QUEUE_NAME } from '../src/queue/orderQueue';

describe('Concurrent order processing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('enqueues multiple orders without conflicts', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        const orderIds = ['order-1', 'order-2', 'order-3', 'order-4', 'order-5'];

        // Enqueue all orders concurrently
        await Promise.all(orderIds.map(id => enqueueOrder(id)));

        // Verify all were enqueued
        expect(addSpy).toHaveBeenCalledTimes(5);

        // Verify each order was enqueued with correct data
        orderIds.forEach((id, index) => {
            expect(addSpy).toHaveBeenNthCalledWith(
                index + 1,
                'execute',
                { orderId: id },
                expect.any(Object)
            );
        });

        addSpy.mockRestore();
    });

    it('uses correct queue name for all jobs', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        await enqueueOrder('order-queue-name-test');

        // Verify queue name is consistent
        expect(ORDER_QUEUE_NAME).toBe('order-execution-queue');

        addSpy.mockRestore();
    });

    it('handles rapid concurrent submissions', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        // Simulate rapid submissions (10 orders)
        const rapidOrders = Array.from({ length: 10 }, (_, i) => `rapid-order-${i}`);

        const startTime = Date.now();
        await Promise.all(rapidOrders.map(id => enqueueOrder(id)));
        const endTime = Date.now();

        // All should be enqueued quickly (< 1 second)
        expect(endTime - startTime).toBeLessThan(1000);
        expect(addSpy).toHaveBeenCalledTimes(10);

        addSpy.mockRestore();
    });

    it('maintains job data integrity for concurrent orders', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        const orders = [
            { id: 'order-A' },
            { id: 'order-B' },
            { id: 'order-C' }
        ];

        await Promise.all(orders.map(o => enqueueOrder(o.id)));

        // Verify each order maintains its unique ID
        orders.forEach((order, index) => {
            const callData = addSpy.mock.calls[index][1];
            expect(callData).toEqual({ orderId: order.id });
        });

        addSpy.mockRestore();
    });
});
