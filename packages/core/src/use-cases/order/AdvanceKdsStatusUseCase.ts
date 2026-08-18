import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderStatus } from '../../domain/entities/Order';
import { Result } from '../../shared/Result';
import { DomainError, InvalidOrderStateError } from '../../shared/DomainError';

export interface AdvanceKdsStatusInputDTO {
  orderId: string;
  nextStatus: OrderStatus;
}

export interface AdvanceKdsStatusOutputDTO {
  orderId: string;
  orderNumber: number;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  updatedAt: Date;
}

export class AdvanceKdsStatusUseCase {
  constructor(private orderRepo: IOrderRepository) {}

  async execute(request: AdvanceKdsStatusInputDTO): Promise<Result<AdvanceKdsStatusOutputDTO, DomainError>> {
    const order = await this.orderRepo.findById(request.orderId);
    if (!order) {
      return Result.fail(new InvalidOrderStateError(`Pedido com ID '${request.orderId}' não foi encontrado.`));
    }

    const previousStatus = order.status;
    const transitionResult = order.advanceStatus(request.nextStatus);

    if (transitionResult.isFailure) {
      return Result.fail(transitionResult.getError());
    }

    // Persistir atualização e registro no histórico
    await this.orderRepo.save(order);

    return Result.ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: order.status,
      updatedAt: order.updatedAt
    });
  }
}
