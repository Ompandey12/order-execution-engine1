import { Queue, Worker, JobsOptions } from 'bullmq';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { processOrder } from '../services/orderService';

export const ORDER_QUEUE_NAME = 'order-execution-queue';

export const orderQueue = new Queue(ORDER_QUEUE_NAME, {
  connection: redis
});

export async function enqueueOrder(orderId: string) {
  const opts: JobsOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  };

  await orderQueue.add('execute', { orderId }, opts);
}

export function createOrderWorker() {
  const worker = new Worker(
    ORDER_QUEUE_NAME,
    async (job) => {
      const { orderId } = job.data as { orderId: string };
      logger.info('Processing order job', { orderId, jobId: job.id });
      await processOrder(orderId);
    },
    {
      connection: redis,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 60_000
      }
    }
  );

  worker.on('completed', (job) => {
    logger.info('Order job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('Order job failed', { jobId: job?.id, error: err.message });
  });

  return worker;
}
