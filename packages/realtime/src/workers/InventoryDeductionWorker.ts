import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../redis.js';
import { INVENTORY_DEDUCTION_QUEUE_NAME, InventoryDeductionJobPayload } from '../queues/inventoryQueue.js';
import { DeductInventoryForOrderUseCase } from '@cardap/core';
import {
  PrismaOrderRepository,
  PrismaInventoryRepository,
  PrismaRecipeRepository
} from '@cardap/database';

/**
 * Worker de Segundo Plano: Consome a fila de Baixa de Estoque via BullMQ.
 * Processa a ficha técnica de pedidos em segundo plano sem bloquear a thread principal do PDV.
 */
export class InventoryDeductionWorker {
  private worker: Worker<InventoryDeductionJobPayload>;

  constructor() {
    const orderRepo = new PrismaOrderRepository();
    const inventoryRepo = new PrismaInventoryRepository();
    const recipeRepo = new PrismaRecipeRepository();

    const deductUseCase = new DeductInventoryForOrderUseCase(orderRepo, inventoryRepo, recipeRepo);

    this.worker = new Worker<InventoryDeductionJobPayload>(
      INVENTORY_DEDUCTION_QUEUE_NAME,
      async (job: Job<InventoryDeductionJobPayload>) => {
        console.log(`[Worker Estoque] Processando baixa para o Pedido #${job.data.orderId} (Tentativa ${job.attemptsMade + 1})`);

        const result = await deductUseCase.execute({
          orderId: job.data.orderId,
          executedByUserId: job.data.executedByUserId,
          allowNegativeStock: false
        });

        if (result.isFailure) {
          const error = result.getError();
          console.error(`[Worker Estoque Error] Pedido #${job.data.orderId}: ${error.message}`);
          throw new Error(error.message); // Dispara retentativa no BullMQ com backoff exponencial
        }

        const summary = result.getValue();
        console.log(
          `[Worker Estoque Sucesso] Pedido #${summary.orderNumber} baixado com sucesso: ${summary.totalMovements} movimentações de insumos registradas.`
        );

        return summary;
      },
      {
        connection: redisConnectionOptions,
        concurrency: 5 // Processa até 5 baixas simultâneas de fichas técnicas
      }
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[Worker Job Failed] Job ID ${job?.id} para o Pedido #${job?.data.orderId} falhou:`, err.message);
    });

    this.worker.on('completed', (job) => {
      console.log(`[Worker Job Completed] Job ID ${job.id} concluído com sucesso.`);
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
