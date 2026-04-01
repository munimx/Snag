import type { AppConfig } from '../lib/config.js';
import type { DeliveryWorkerRuntime } from '../workers/delivery-worker.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    deliveryWorker: DeliveryWorkerRuntime;
  }
}
