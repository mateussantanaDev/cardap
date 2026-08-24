import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../redis';

export interface InventoryDeductionJobPayload {
  orderId: string;
  executedByUserId?: string;
}

export const INVENTORY_DEDUCTION_QUEUE_NAME = 'inventory-deduction-queue';

/**
 * Fila BullMQ para processamento assíncrono de baixas de estoque e ficha técnica.
 * Evita travamento da thread principal do PDV durante picos de venda.
 */
let _queue: Queue<InventoryDeductionJobPayload> | null = null;

export const getInventoryDeductionQueue = (): Queue<InventoryDeductionJobPayload> => {
  if (!_queue) {
    _queue = new Queue<InventoryDeductionJobPayload>(
      INVENTORY_DEDUCTION_QUEUE_NAME,
      {
        connection: redisConnectionOptions,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: {
            age: 3600 * 24,
            count: 1000
          },
          removeOnFail: {
            age: 3600 * 24 * 7
          }
        }
      }
    );
  }
  return _queue;
};

export const inventoryDeductionQueue = new Proxy({} as Queue<InventoryDeductionJobPayload>, {
  get(_target, prop) {
    const instance = getInventoryDeductionQueue();
    const val = (instance as any)[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  }
});
