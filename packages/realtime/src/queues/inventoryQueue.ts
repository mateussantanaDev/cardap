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
export const inventoryDeductionQueue = new Queue<InventoryDeductionJobPayload>(
  INVENTORY_DEDUCTION_QUEUE_NAME,
  {
    connection: redisConnectionOptions,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000 // 2s, 4s, 8s, 16s...
      },
      removeOnComplete: {
        age: 3600 * 24, // Mantém histórico por 24 horas
        count: 1000
      },
      removeOnFail: {
        age: 3600 * 24 * 7 // Mantém falhas por 7 dias para auditoria
      }
    }
  }
);
