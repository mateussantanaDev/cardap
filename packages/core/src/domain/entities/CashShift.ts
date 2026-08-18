import { Money } from '../value-objects/Money';
import { Result } from '../../shared/Result';
import {
  DomainError,
  ClosedCashShiftError,
  InvalidCashShiftStateError,
  InsufficientCashBalanceError,
  InvalidAmountError
} from '../../shared/DomainError';

export type ShiftStatus = 'ABERTO' | 'FECHADO';
export type CashTransactionType = 'SUPRIMENTO' | 'SANGRIA' | 'REFORCO' | 'ENTRADA_PEDIDO';

export interface CashTransactionProps {
  id: string;
  shiftId: string;
  userId: string;
  orderId?: string;
  type: CashTransactionType;
  amount: Money;
  description: string;
  createdAt?: Date;
}

export class CashTransaction {
  public readonly id: string;
  public readonly shiftId: string;
  public readonly userId: string;
  public readonly orderId?: string;
  public readonly type: CashTransactionType;
  public readonly amount: Money;
  public readonly description: string;
  public readonly createdAt: Date;

  constructor(props: CashTransactionProps) {
    if (props.amount.isZero() || props.amount.isNegative()) {
      throw new Error("O valor da movimentação de caixa deve ser estritamente positivo.");
    }
    this.id = props.id;
    this.shiftId = props.shiftId;
    this.userId = props.userId;
    this.orderId = props.orderId;
    this.type = props.type;
    this.amount = props.amount;
    this.description = props.description;
    this.createdAt = props.createdAt || new Date();
  }
}

export interface CashShiftProps {
  id: string;
  openedByUserId: string;
  closedByUserId?: string;
  openedAt?: Date;
  closedAt?: Date;
  initialAmount: Money;
  actualFinalAmount?: Money;
  status?: ShiftStatus;
  notes?: string;
  transactions?: CashTransaction[];
}

export interface BlindCloseResult {
  expectedFinalAmount: Money;
  actualFinalAmount: Money;
  differenceAmount: Money; // Positivo = Sobra de Caixa, Negativo = Falta/Quebra de Caixa
}

/**
 * Agregado de Domínio: CashShift (Turno de Caixa)
 * Gerencia ciclo de vida do caixa, sangrias, suprimentos e realiza a auditoria do fechamento cego.
 */
export class CashShiftEntity {
  private readonly _id: string;
  private readonly _openedByUserId: string;
  private _closedByUserId?: string;
  private readonly _openedAt: Date;
  private _closedAt?: Date;
  private readonly _initialAmount: Money;
  private _expectedFinalAmount?: Money;
  private _actualFinalAmount?: Money;
  private _differenceAmount?: Money;
  private _status: ShiftStatus;
  private _notes?: string;
  private _transactions: CashTransaction[];

  constructor(props: CashShiftProps) {
    if (props.initialAmount.isNegative()) {
      throw new Error("O saldo inicial do caixa não pode ser negativo.");
    }

    this._id = props.id;
    this._openedByUserId = props.openedByUserId;
    this._closedByUserId = props.closedByUserId;
    this._openedAt = props.openedAt || new Date();
    this._closedAt = props.closedAt;
    this._initialAmount = props.initialAmount;
    this._actualFinalAmount = props.actualFinalAmount;
    this._status = props.status || 'ABERTO';
    this._notes = props.notes;
    this._transactions = props.transactions ? [...props.transactions] : [];
  }

  // --- Getters ---
  public get id(): string { return this._id; }
  public get openedByUserId(): string { return this._openedByUserId; }
  public get closedByUserId(): string | undefined { return this._closedByUserId; }
  public get openedAt(): Date { return this._openedAt; }
  public get closedAt(): Date | undefined { return this._closedAt; }
  public get initialAmount(): Money { return this._initialAmount; }
  public get expectedFinalAmount(): Money | undefined { return this._expectedFinalAmount; }
  public get actualFinalAmount(): Money | undefined { return this._actualFinalAmount; }
  public get differenceAmount(): Money | undefined { return this._differenceAmount; }
  public get status(): ShiftStatus { return this._status; }
  public get notes(): string | undefined { return this._notes; }
  public get transactions(): ReadonlyArray<CashTransaction> { return [...this._transactions]; }

  /**
   * Retorna o saldo atual acumulado de DINHEIRO físico disponível na gaveta do caixa.
   */
  public calculateCurrentCashInDrawer(): Money {
    let balance = this._initialAmount;

    for (const tx of this._transactions) {
      if (tx.type === 'SUPRIMENTO' || tx.type === 'REFORCO' || tx.type === 'ENTRADA_PEDIDO') {
        balance = balance.add(tx.amount);
      } else if (tx.type === 'SANGRIA') {
        balance = balance.subtract(tx.amount);
      }
    }

    return balance;
  }

  /**
   * Registra uma Sangria (retirada de dinheiro da gaveta).
   */
  public registerSangria(userId: string, amount: Money, description: string, txId: string): Result<CashTransaction, DomainError> {
    if (this._status === 'FECHADO') {
      return Result.fail(new ClosedCashShiftError());
    }
    if (amount.isZero() || amount.isNegative()) {
      return Result.fail(new InvalidAmountError("O valor da sangria deve ser maior que zero."));
    }

    const currentCash = this.calculateCurrentCashInDrawer();
    if (amount.isGreaterThan(currentCash)) {
      return Result.fail(new InsufficientCashBalanceError(amount.formatBRL(), currentCash.formatBRL()));
    }

    const tx = new CashTransaction({
      id: txId,
      shiftId: this._id,
      userId,
      type: 'SANGRIA',
      amount,
      description
    });

    this._transactions.push(tx);
    return Result.ok(tx);
  }

  /**
   * Registra um Suprimento/Reforço (entrada de dinheiro no caixa).
   */
  public registerSuprimento(userId: string, amount: Money, description: string, txId: string): Result<CashTransaction, DomainError> {
    if (this._status === 'FECHADO') {
      return Result.fail(new ClosedCashShiftError());
    }
    if (amount.isZero() || amount.isNegative()) {
      return Result.fail(new InvalidAmountError("O valor do suprimento deve ser maior que zero."));
    }

    const tx = new CashTransaction({
      id: txId,
      shiftId: this._id,
      userId,
      type: 'SUPRIMENTO',
      amount,
      description
    });

    this._transactions.push(tx);
    return Result.ok(tx);
  }

  /**
   * Registra entrada de dinheiro referente a uma venda.
   */
  public registerOrderPayment(userId: string, orderId: string, amount: Money, txId: string): Result<CashTransaction, DomainError> {
    if (this._status === 'FECHADO') {
      return Result.fail(new ClosedCashShiftError());
    }

    const tx = new CashTransaction({
      id: txId,
      shiftId: this._id,
      userId,
      orderId,
      type: 'ENTRADA_PEDIDO',
      amount,
      description: `Pagamento em dinheiro Pedido #${orderId}`
    });

    this._transactions.push(tx);
    return Result.ok(tx);
  }

  /**
   * Executa o Fechamento Cego do Turno de Caixa.
   * O operador informa o valor contado fisicamente (actualFinalAmount) sem ver a expectativa do sistema.
   * A entidade calcula o valor esperado e a diferença (quebra/sobra).
   */
  public closeBlind(closedByUserId: string, actualFinalAmount: Money, notes?: string): Result<BlindCloseResult, DomainError> {
    if (this._status === 'FECHADO') {
      return Result.fail(new InvalidCashShiftStateError("Este turno de caixa já se encontra FECHADO."));
    }

    const expectedFinalAmount = this.calculateCurrentCashInDrawer();
    const differenceAmount = actualFinalAmount.subtract(expectedFinalAmount);

    this._status = 'FECHADO';
    this._closedByUserId = closedByUserId;
    this._closedAt = new Date();
    this._expectedFinalAmount = expectedFinalAmount;
    this._actualFinalAmount = actualFinalAmount;
    this._differenceAmount = differenceAmount;
    if (notes) this._notes = notes;

    return Result.ok({
      expectedFinalAmount,
      actualFinalAmount,
      differenceAmount
    });
  }
}
