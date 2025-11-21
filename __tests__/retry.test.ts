import { orderQueue, enqueueOrder } from '../src/queue/orderQueue';

describe('Retry and failure handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('configures exponential backoff retry strategy', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        await enqueueOrder('order-retry-test');

        expect(addSpy).toHaveBeenCalledWith(
            'execute',
            { orderId: 'order-retry-test' },
            expect.objectContaining({
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            })
        );

        addSpy.mockRestore();
    });

    it('sets correct retry attempts limit', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        await enqueueOrder('order-123');

        const callArgs = addSpy.mock.calls[0][2];
        expect(callArgs).toHaveProperty('attempts', 3);

        addSpy.mockRestore();
    });

    it('configures job cleanup options', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        await enqueueOrder('order-cleanup-test');

        expect(addSpy).toHaveBeenCalledWith(
            'execute',
            expect.any(Object),
            expect.objectContaining({
                removeOnComplete: true,
                removeOnFail: false
            })
        );

        addSpy.mockRestore();
    });

    it('validates exponential backoff delay', async () => {
        const addSpy = jest.spyOn(orderQueue, 'add').mockResolvedValue({} as any);

        await enqueueOrder('order-backoff-test');

        const callArgs = addSpy.mock.calls[0][2];
        expect(callArgs?.backoff).toEqual({
            type: 'exponential',
            delay: 1000
        });

        addSpy.mockRestore();
    });
});
