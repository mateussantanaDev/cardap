import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Result } from '../../shared/Result';
import { DomainError, InvalidOrderStateError } from '../../shared/DomainError';

export interface GetOrderStatusInputDTO {
  orderId?: string;
  orderNumber?: number;
}

export interface GetOrderStatusOutputDTO {
  orderId: string;
  orderNumber: number;
  type: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  tableId?: string;
  customerId?: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  formattedTotal: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    notes?: string;
    assemblies: Array<{ id: string; name: string; priceAdjustmentCents: number }>;
    modifiers: Array<{ id: string; name: string; priceAdjustmentCents: number }>;
    complements: Array<{ id: string; name: string; priceAdjustmentCents: number }>;
  }>;
}

/**
 * Caso de Uso: Consulta do Status do Pedido KDS
 * Retorna o status em tempo real do pedido e detalhes para acompanhamento na Vitrine.
 */
export class GetOrderStatusUseCase {
  constructor(private orderRepo: IOrderRepository) {}

  async execute(request: GetOrderStatusInputDTO): Promise<Result<GetOrderStatusOutputDTO, DomainError>> {
    let order = null;

    if (request.orderId) {
      order = await this.orderRepo.findById(request.orderId);
    } else if (request.orderNumber) {
      order = await this.orderRepo.findByOrderNumber(request.orderNumber);
    }

    if (!order) {
      return Result.fail(new InvalidOrderStateError("Pedido não encontrado."));
    }

    const itemsDto = order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPrice.getCents(),
      totalCents: item.calculateTotal().getCents(),
      notes: item.notes,
      assemblies: item.assemblies.map(a => ({ id: a.id, name: a.name, priceAdjustmentCents: a.priceAdjustment.getCents() })),
      modifiers: item.modifiers.map(m => ({ id: m.id, name: m.name, priceAdjustmentCents: m.priceAdjustment.getCents() })),
      complements: item.complements.map(c => ({ id: c.id, name: c.name, priceAdjustmentCents: c.priceAdjustment.getCents() }))
    }));

    return Result.ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      tableId: order.tableId,
      customerId: order.customerId,
      subtotalCents: order.subtotal.getCents(),
      deliveryFeeCents: order.deliveryFee.getCents(),
      discountAmountCents: order.discountAmount.getCents(),
      totalAmountCents: order.totalAmount.getCents(),
      formattedTotal: order.totalAmount.formatBRL(),
      notes: order.notes,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: itemsDto
    });
  }
}
