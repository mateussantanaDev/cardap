import { Money } from '../value-objects/Money';
import { Result } from '../../shared/Result';
import { DomainError, InvalidOrderStateError, EmptyOrderItemsError } from '../../shared/DomainError';

export type OrderType = 'SALAO' | 'BALCAO' | 'DELIVERY';
export type OrderStatus = 'PENDENTE' | 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';
export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'VR_VA';
export type PaymentStatus = 'PENDENTE' | 'PAGO' | 'REEMBOLSADO' | 'CANCELADO';

export interface OrderItemOptionProps {
  id: string;
  name: string;
  priceAdjustment: Money;
  quantity: number;
}

export interface OrderItemProps {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
  notes?: string;
  modifiers?: OrderItemOptionProps[];
  assemblies?: OrderItemOptionProps[];
  complements?: OrderItemOptionProps[];
}

export class OrderItem {
  public readonly id: string;
  public readonly productId: string;
  public readonly productName: string;
  private _quantity: number;
  public readonly unitPrice: Money;
  public readonly notes?: string;
  public readonly modifiers: OrderItemOptionProps[];
  public readonly assemblies: OrderItemOptionProps[];
  public readonly complements: OrderItemOptionProps[];

  constructor(props: OrderItemProps) {
    if (props.quantity <= 0) {
      throw new Error("A quantidade do item deve ser maior que zero.");
    }
    this.id = props.id;
    this.productId = props.productId;
    this.productName = props.productName;
    this._quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.notes = props.notes;
    this.modifiers = props.modifiers || [];
    this.assemblies = props.assemblies || [];
    this.complements = props.complements || [];
  }

  public get quantity(): number {
    return this._quantity;
  }

  /**
   * Calcula o valor total deste item incluindo adicionais, modificadores e montagens.
   */
  public calculateTotal(): Money {
    let basePrice = this.unitPrice;

    for (const mod of this.modifiers) {
      basePrice = basePrice.add(mod.priceAdjustment.multiply(mod.quantity));
    }
    for (const asm of this.assemblies) {
      basePrice = basePrice.add(asm.priceAdjustment.multiply(asm.quantity));
    }
    for (const cmp of this.complements) {
      basePrice = basePrice.add(cmp.priceAdjustment.multiply(cmp.quantity));
    }

    return basePrice.multiply(this._quantity);
  }
}

export interface OrderProps {
  id: string;
  orderNumber: number;
  type: OrderType;
  status?: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  deliveryFee?: Money;
  discountAmount?: Money;
  items: OrderItem[];
  customerId?: string;
  tableId?: string;
  shiftId: string;
  notes?: string;
  createdAt?: Date;
}

/**
 * Agregado de Domínio: Order (Pedido)
 * Protege o estado do pedido, valida a máquina de estados e garante integridade financeira.
 */
export class OrderEntity {
  private readonly _id: string;
  private readonly _orderNumber: number;
  private readonly _type: OrderType;
  private _status: OrderStatus;
  private readonly _paymentMethod: PaymentMethod;
  private _paymentStatus: PaymentStatus;
  private _subtotal: Money;
  private _deliveryFee: Money;
  private _discountAmount: Money;
  private _totalAmount: Money;
  private _items: OrderItem[];
  private readonly _customerId?: string;
  private readonly _tableId?: string;
  private readonly _shiftId: string;
  private _notes?: string;
  private _cancellationReason?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: OrderProps) {
    this._id = props.id;
    this._orderNumber = props.orderNumber;
    this._type = props.type;
    this._status = props.status || 'PENDENTE';
    this._paymentMethod = props.paymentMethod;
    this._paymentStatus = props.paymentStatus || 'PENDENTE';
    this._deliveryFee = props.deliveryFee || Money.zero();
    this._discountAmount = props.discountAmount || Money.zero();
    this._items = props.items && props.items.length > 0 ? [...props.items] : [];
    this._customerId = props.customerId;
    this._tableId = props.tableId;
    this._shiftId = props.shiftId;
    this._notes = props.notes;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = new Date();

    this._subtotal = Money.zero();
    this._totalAmount = Money.zero();
    if (this._items.length > 0) {
      this.recalculateTotals();
    }
  }

  // --- Getters ---
  public get id(): string { return this._id; }
  public get orderNumber(): number { return this._orderNumber; }
  public get type(): OrderType { return this._type; }
  public get status(): OrderStatus { return this._status; }
  public get paymentMethod(): PaymentMethod { return this._paymentMethod; }
  public get paymentStatus(): PaymentStatus { return this._paymentStatus; }
  public get subtotal(): Money { return this._subtotal; }
  public get deliveryFee(): Money { return this._deliveryFee; }
  public get discountAmount(): Money { return this._discountAmount; }
  public get totalAmount(): Money { return this._totalAmount; }
  public get items(): ReadonlyArray<OrderItem> { return [...this._items]; }
  public get customerId(): string | undefined { return this._customerId; }
  public get tableId(): string | undefined { return this._tableId; }
  public get shiftId(): string { return this._shiftId; }
  public get notes(): string | undefined { return this._notes; }
  public get cancellationReason(): string | undefined { return this._cancellationReason; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  // --- Regras de Negócio & Máquina de Estados ---

  /**
   * Recalcula o subtotal e o total do pedido com base nos itens, taxa de entrega e desconto.
   */
  private recalculateTotals(): void {
    let subtotalAcc = Money.zero();
    for (const item of this._items) {
      subtotalAcc = subtotalAcc.add(item.calculateTotal());
    }
    this._subtotal = subtotalAcc;

    // total = (subtotal + entrega) - desconto
    const grossTotal = this._subtotal.add(this._deliveryFee);
    if (this._discountAmount.isGreaterThan(grossTotal)) {
      this._totalAmount = Money.zero();
    } else {
      this._totalAmount = grossTotal.subtract(this._discountAmount);
    }
  }

  /**
   * Adiciona um item ao pedido se ele ainda estiver editável.
   */
  public addItem(item: OrderItem): Result<void, DomainError> {
    if (this._status !== 'PENDENTE') {
      return Result.fail(new InvalidOrderStateError("Itens só podem ser adicionados enquanto o pedido estiver PENDENTE."));
    }
    this._items.push(item);
    this.recalculateTotals();
    this._updatedAt = new Date();
    return Result.ok();
  }

  /**
   * Aplica um desconto ao pedido.
   */
  public applyDiscount(discount: Money): Result<void, DomainError> {
    if (this._status === 'CANCELADO' || this._status === 'ENTREGUE') {
      return Result.fail(new InvalidOrderStateError("Não é possível aplicar desconto em pedidos encerrados ou cancelados."));
    }
    this._discountAmount = discount;
    this.recalculateTotals();
    this._updatedAt = new Date();
    return Result.ok();
  }

  /**
   * Transição segura na máquina de estados do KDS / Pedido.
   */
  public advanceStatus(nextStatus: OrderStatus): Result<void, DomainError> {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDENTE: ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'],
      RECEBIDO: ['EM_PREPARO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'],
      EM_PREPARO: ['RECEBIDO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'],
      PRONTO: ['EM_PREPARO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'],
      SAIU_PARA_ENTREGA: ['PRONTO', 'ENTREGUE', 'CANCELADO'],
      ENTREGUE: ['SAIU_PARA_ENTREGA', 'PRONTO'],
      CANCELADO: []
    };

    if (this._status === nextStatus) {
      return Result.ok(); // Idempotente
    }

    const allowed = validTransitions[this._status];
    if (!allowed || !allowed.includes(nextStatus)) {
      return Result.fail(
        new InvalidOrderStateError(
          `Transição de status ilegal no KDS: não é permitido alterar de '${this._status}' para '${nextStatus}'.`
        )
      );
    }

    this._status = nextStatus;
    this._updatedAt = new Date();
    return Result.ok();
  }

  /**
   * Cancela o pedido com um motivo explícito.
   */
  public cancel(reason: string): Result<void, DomainError> {
    if (this._status === 'ENTREGUE') {
      return Result.fail(new InvalidOrderStateError("Não é possível cancelar um pedido que já foi ENTREGUE."));
    }
    if (this._status === 'CANCELADO') {
      return Result.ok();
    }
    if (!reason || reason.trim().length === 0) {
      return Result.fail(new InvalidOrderStateError("É obrigatório fornecer um motivo para o cancelamento do pedido."));
    }

    this._status = 'CANCELADO';
    this._cancellationReason = reason;
    this._paymentStatus = 'CANCELADO';
    this._updatedAt = new Date();
    return Result.ok();
  }

  /**
   * Marca o pagamento como PAGO.
   */
  public markAsPaid(): Result<void, DomainError> {
    if (this._status === 'CANCELADO') {
      return Result.fail(new InvalidOrderStateError("Não é possível pagar um pedido CANCELADO."));
    }
    this._paymentStatus = 'PAGO';
    this._updatedAt = new Date();
    return Result.ok();
  }
}
