/**
 * Classe Base Abstrata para Erros de Domínio do Cardap.
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
  }
}

/**
 * Erros específicos de Catálogo
 */
export class InvalidCatalogError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_CATALOG_ERROR');
  }
}

/**
 * Erros específicos do ciclo de vida de Pedidos
 */
export class InvalidOrderStateError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_ORDER_STATE');
  }
}

export class EmptyOrderItemsError extends DomainError {
  constructor() {
    super("Um pedido precisa conter pelo menos um item.", 'EMPTY_ORDER_ITEMS');
  }
}

/**
 * Erros específicos da Operação Financeira de Caixa
 */
export class ClosedCashShiftError extends DomainError {
  constructor() {
    super("Não é possível realizar operações financeiras em um turno de caixa FECHADO.", 'CLOSED_CASH_SHIFT');
  }
}

export class InvalidCashShiftStateError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_CASH_SHIFT_STATE');
  }
}

export class InsufficientCashBalanceError extends DomainError {
  constructor(requestedAmount: string, availableAmount: string) {
    super(
      `Saldo em dinheiro insuficiente no caixa para realizar sangria. Solicitado: ${requestedAmount}, Disponível: ${availableAmount}`,
      'INSUFFICIENT_CASH_BALANCE'
    );
  }
}

export class InvalidAmountError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_AMOUNT');
  }
}
