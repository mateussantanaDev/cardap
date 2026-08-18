import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { ITableRepository } from '../../domain/repositories/ITableRepository';
import { Result } from '../../shared/Result';
import { DomainError, InvalidOrderStateError } from '../../shared/DomainError';

export interface CancelOrderInputDTO {
  orderId: string;
  reason: string;
}

export interface CancelOrderOutputDTO {
  orderId: string;
  orderNumber: number;
  status: string;
  reason: string;
  updatedAt: Date;
}

export class CancelOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private tableRepo?: ITableRepository
  ) {}

  async execute(request: CancelOrderInputDTO): Promise<Result<CancelOrderOutputDTO, DomainError>> {
    const order = await this.orderRepo.findById(request.orderId);
    if (!order) {
      return Result.fail(new InvalidOrderStateError(`Pedido com ID '${request.orderId}' não encontrado.`));
    }

    const cancelResult = order.cancel(request.reason);
    if (cancelResult.isFailure) {
      return Result.fail(cancelResult.getError());
    }

    await this.orderRepo.save(order);

    // Se o pedido era do salão e pertencia a uma mesa, liberar a mesa se não houver outros pedidos ativos
    if (order.tableId && this.tableRepo) {
      const activeTableOrders = await this.orderRepo.findActiveByTableId(order.tableId);
      if (activeTableOrders.length === 0) {
        await this.tableRepo.updateStatus(order.tableId, 'LIVRE');
      }
    }

    return Result.ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      reason: order.cancellationReason || request.reason,
      updatedAt: order.updatedAt
    });
  }
}
