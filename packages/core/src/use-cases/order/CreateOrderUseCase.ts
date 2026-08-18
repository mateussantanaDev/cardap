import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { ITableRepository } from '../../domain/repositories/ITableRepository';
import { OrderEntity, OrderItem, OrderType, PaymentMethod } from '../../domain/entities/Order';
import { Money } from '../../domain/value-objects/Money';
import { QrTableToken } from '../../domain/value-objects/QrTableToken';
import { Result } from '../../shared/Result';
import { DomainError, InvalidOrderStateError } from '../../shared/DomainError';
import { randomUUID } from 'node:crypto';

export interface CreateOrderItemOptionInputDTO {
  id: string;
  name: string;
  priceAdjustmentCents: number;
  quantity?: number;
}

export interface CreateOrderItemInputDTO {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  notes?: string;
  modifiers?: CreateOrderItemOptionInputDTO[];
  assemblies?: CreateOrderItemOptionInputDTO[];
  complements?: CreateOrderItemOptionInputDTO[];
}

export interface CreateOrderInputDTO {
  type: OrderType;
  shiftId: string;
  paymentMethod: PaymentMethod;
  tableQrToken?: string; // Token JWT para Vitrine B2C na Mesa
  tableId?: string;      // ID direto da mesa para PDV / Garçom
  customerId?: string;
  deliveryFeeCents?: number;
  discountAmountCents?: number;
  notes?: string;
  items: CreateOrderItemInputDTO[];
  jwtSecretKey?: string;
}

export interface CreateOrderOutputDTO {
  orderId: string;
  orderNumber: number;
  type: OrderType;
  status: string;
  tableId?: string;
  tableNumber?: number;
  totalAmountCents: number;
  formattedTotal: string;
  createdAt: Date;
}

/**
 * Caso de Uso: Criação de Pedido (Vitrine B2C & PDV B2B)
 * Valida o token QR da mesa, constrói a entidade do pedido com Money e insere na fila de produção.
 */
export class CreateOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private tableRepo?: ITableRepository
  ) {}

  async execute(
    request: CreateOrderInputDTO
  ): Promise<Result<CreateOrderOutputDTO, DomainError>> {
    let resolvedTableId = request.tableId;
    let resolvedTableNumber: number | undefined = undefined;

    // 1. Validação de Segurança Criptográfica para Consumo Local via QR Code na Mesa (B2C)
    if (request.type === 'SALAO' && request.tableQrToken) {
      const secretKey = request.jwtSecretKey || process.env.JWT_SECRET || 'cardap-secret-key-2026';
      try {
        const verifiedToken = QrTableToken.parseAndVerify(request.tableQrToken, secretKey);
        resolvedTableId = verifiedToken.getTableId();
        resolvedTableNumber = verifiedToken.getTableNumber();
      } catch (error: any) {
        return Result.fail(
          new InvalidOrderStateError(`Segurança do Salão: QR Token de Mesa adulterado ou inválido. Detalhe: ${error.message}`)
        );
      }
    }

    if (request.type === 'SALAO' && !resolvedTableId) {
      return Result.fail(
        new InvalidOrderStateError("Pedidos do tipo SALAO exigem a identificação ou o QR Token assinado de uma Mesa.")
      );
    }

    // 2. Converter DTOs de itens e opções em instâncias de OrderItem utilizando Money
    const domainItems: OrderItem[] = [];

    for (const itemDto of request.items) {
      const itemOptionsMap = (opts?: CreateOrderItemOptionInputDTO[]) =>
        (opts || []).map(o => ({
          id: o.id,
          name: o.name,
          priceAdjustment: Money.fromCents(o.priceAdjustmentCents),
          quantity: o.quantity || 1
        }));

      const orderItem = new OrderItem({
        id: itemDto.id || randomUUID(),
        productId: itemDto.productId,
        productName: itemDto.productName,
        quantity: itemDto.quantity,
        unitPrice: Money.fromCents(itemDto.unitPriceCents),
        notes: itemDto.notes,
        modifiers: itemOptionsMap(itemDto.modifiers),
        assemblies: itemOptionsMap(itemDto.assemblies),
        complements: itemOptionsMap(itemDto.complements)
      });

      domainItems.push(orderItem);
    }

    // 3. Obter número sequencial diário do pedido (#101, #102...)
    const orderNumber = await this.orderRepo.getNextDailyOrderNumber();
    const orderId = randomUUID();

    // 4. Instanciar o Agregado de Domínio OrderEntity
    let orderEntity: OrderEntity;
    try {
      orderEntity = new OrderEntity({
        id: orderId,
        orderNumber,
        type: request.type,
        paymentMethod: request.paymentMethod,
        shiftId: request.shiftId,
        customerId: request.customerId,
        tableId: resolvedTableId,
        deliveryFee: Money.fromCents(request.deliveryFeeCents || 0),
        discountAmount: Money.fromCents(request.discountAmountCents || 0),
        notes: request.notes,
        items: domainItems
      });
    } catch (err: any) {
      return Result.fail(new InvalidOrderStateError(err.message));
    }

    // 5. Salvar pedido no repositório de dados
    await this.orderRepo.save(orderEntity);

    // 6. Atualizar status da mesa no salão para OCUPADA se for atendimento presencial
    if (resolvedTableId && this.tableRepo) {
      await this.tableRepo.updateStatus(resolvedTableId, 'OCUPADA');
    }

    return Result.ok({
      orderId: orderEntity.id,
      orderNumber: orderEntity.orderNumber,
      type: orderEntity.type,
      status: orderEntity.status,
      tableId: resolvedTableId,
      tableNumber: resolvedTableNumber,
      totalAmountCents: orderEntity.totalAmount.getCents(),
      formattedTotal: orderEntity.totalAmount.formatBRL(),
      createdAt: orderEntity.createdAt
    });
  }
}
