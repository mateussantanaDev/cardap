import { ICashShiftRepository } from '../../domain/repositories/ICashShiftRepository';
import { Money } from '../../domain/value-objects/Money';
import { Result } from '../../shared/Result';
import { DomainError, InvalidCashShiftStateError } from '../../shared/DomainError';

export interface CloseBlindCashShiftInputDTO {
  shiftId: string;
  closedByUserId: string;
  actualFinalCents: number;
  notes?: string;
}

export interface CloseBlindCashShiftOutputDTO {
  shiftId: string;
  openedAt: Date;
  closedAt: Date;
  expectedFinalAmountFormatted: string;
  actualFinalAmountFormatted: string;
  differenceAmountFormatted: string;
  differenceCents: number;
  isBalancePerfect: boolean;
  hasQuebraDeCaixa: boolean;
  hasSobraDeCaixa: boolean;
}

/**
 * Caso de Uso: Fechamento Cego de Turno de Caixa
 * Executa a conferência cega do operador, calcula sobrante ou quebra de caixa e persiste o encerramento do turno.
 */
export class CloseBlindCashShiftUseCase {
  constructor(private cashShiftRepo: ICashShiftRepository) {}

  async execute(
    request: CloseBlindCashShiftInputDTO
  ): Promise<Result<CloseBlindCashShiftOutputDTO, DomainError>> {
    // 1. Buscar o turno de caixa ativo
    const shift = await this.cashShiftRepo.findById(request.shiftId);
    if (!shift) {
      return Result.fail(new InvalidCashShiftStateError(`Turno de caixa com ID '${request.shiftId}' não foi encontrado.`));
    }

    // 2. Converter valor contado em cédulas/moedas para Value Object Money
    const actualFinalMoney = Money.fromCents(request.actualFinalCents);

    // 3. Executar o Fechamento Cego no Agregado de Domínio
    const closeResult = shift.closeBlind(request.closedByUserId, actualFinalMoney, request.notes);
    if (closeResult.isFailure) {
      return Result.fail(closeResult.getError());
    }

    const { expectedFinalAmount, actualFinalAmount, differenceAmount } = closeResult.getValue();

    // 4. Persistir a entidade atualizada no repositório
    await this.cashShiftRepo.save(shift);

    const differenceCents = differenceAmount.getCents();

    // 5. Retornar os dados formatados da conferência financeiro-operacional
    return Result.ok({
      shiftId: shift.id,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt!,
      expectedFinalAmountFormatted: expectedFinalAmount.formatBRL(),
      actualFinalAmountFormatted: actualFinalAmount.formatBRL(),
      differenceAmountFormatted: differenceAmount.formatBRL(),
      differenceCents,
      isBalancePerfect: differenceAmount.isZero(),
      hasQuebraDeCaixa: differenceAmount.isNegative(),
      hasSobraDeCaixa: differenceAmount.isGreaterThan(Money.zero())
    });
  }
}
