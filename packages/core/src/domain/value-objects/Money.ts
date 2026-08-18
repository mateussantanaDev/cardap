/**
 * Value Object: Money
 * Representação imutável de valor monetário em centavos inteiros.
 * Evita imprecisão de ponto flutuante (floating point arithmetic errors) em operações financeiras e PDV.
 */
export class Money {
  private readonly cents: number;

  private constructor(cents: number) {
    if (!Number.isInteger(cents)) {
      throw new Error(`Money requer um valor inteiro em centavos. Recebido: ${cents}`);
    }
    this.cents = cents;
  }

  /**
   * Cria uma instância de Money a partir de centavos inteiros (ex: 4850 = R$ 48,50).
   */
  public static fromCents(cents: number): Money {
    return new Money(Math.round(cents));
  }

  /**
   * Cria uma instância de Money a partir de um valor decimal ou string (ex: 48.50 ou "48.50").
   */
  public static fromDecimal(amount: number | string): Money {
    const numericValue = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;
    if (isNaN(numericValue)) {
      throw new Error(`Valor decimal inválido para Money: ${amount}`);
    }
    return new Money(Math.round(numericValue * 100));
  }

  /**
   * Retorna um valor Money zerado (R$ 0,00).
   */
  public static zero(): Money {
    return new Money(0);
  }

  /**
   * Retorna o valor interno em centavos inteiros.
   */
  public getCents(): number {
    return this.cents;
  }

  /**
   * Converte para formato decimal number (ex: 48.5).
   */
  public toDecimal(): number {
    return this.cents / 100;
  }

  /**
   * Formata para moeda nacional brasileira BRL (ex: "R$ 48,50").
   */
  public formatBRL(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(this.toDecimal());
  }

  /**
   * Adiciona outro valor Money, retornando uma nova instância imutável.
   */
  public add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  /**
   * Subtrai outro valor Money, retornando uma nova instância imutável.
   */
  public subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  /**
   * Multiplica por um fator quantitativo (ex: 3 unidades de R$ 12,50).
   */
  public multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor));
  }

  /**
   * Compara igualdade com outro valor Money.
   */
  public equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /**
   * Verifica se este valor é maior que outro Money.
   */
  public isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  /**
   * Verifica se este valor é menor que outro Money.
   */
  public isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  /**
   * Retorna true se for zerado.
   */
  public isZero(): boolean {
    return this.cents === 0;
  }

  /**
   * Retorna true se o valor for negativo.
   */
  public isNegative(): boolean {
    return this.cents < 0;
  }
}
