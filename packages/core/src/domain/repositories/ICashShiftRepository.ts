import { CashShiftEntity } from '../entities/CashShift';

/**
 * Interface do Repositório de Turnos de Caixa (Dependency Inversion)
 */
export interface ICashShiftRepository {
  /**
   * Salva ou atualiza o turno de caixa no armazenamento.
   */
  save(shift: CashShiftEntity): Promise<void>;

  /**
   * Busca um turno de caixa pelo ID.
   */
  findById(id: string): Promise<CashShiftEntity | null>;

  /**
   * Retorna o turno de caixa atualmente ABERTO, se houver.
   */
  findCurrentOpenShift(): Promise<CashShiftEntity | null>;

  /**
   * Lista histórico de turnos de caixa por intervalo de datas.
   */
  findShiftsByDateRange(startDate: Date, endDate: Date): Promise<CashShiftEntity[]>;
}
