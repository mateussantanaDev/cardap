/**
 * Pattern: Result<T, E>
 * Encapsula o resultado de uma operação de domínio, prevenindo exceptions não tratadas.
 */
export class Result<T, E = Error> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(isSuccess: boolean, error?: E, value?: T) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._value = value;
    this._error = error;
  }

  /**
   * Retorna um Result de Sucesso contendo um valor tipado.
   */
  public static ok<U, F = Error>(value?: U): Result<U, F> {
    return new Result<U, F>(true, undefined, value);
  }

  /**
   * Retorna um Result de Falha contendo um erro de domínio.
   */
  public static fail<U, F = Error>(error: F): Result<U, F> {
    return new Result<U, F>(false, error, undefined);
  }

  /**
   * Combina múltiplos Results. Retorna o primeiro que falhou ou ok().
   */
  public static combine<F = Error>(results: Result<unknown, F>[]): Result<void, F> {
    for (const result of results) {
      if (result.isFailure) return Result.fail<void, F>(result.getError());
    }
    return Result.ok<void, F>();
  }

  /**
   * Obtém o valor em caso de sucesso. Lança exceção de infra se acessado indevidamente.
   */
  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Não é possível obter o valor de um Result que falhou.");
    }
    return this._value as T;
  }

  /**
   * Obtém o erro em caso de falha. Lança exceção de infra se acessado indevidamente.
   */
  public getError(): E {
    if (!this.isFailure) {
      throw new Error("Não é possível obter o erro de um Result bem-sucedido.");
    }
    return this._error as E;
  }
}
