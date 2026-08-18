import { ICashShiftRepository } from '../../domain/repositories/ICashShiftRepository';
import { CashShiftEntity } from '../../domain/entities/CashShift';
import { Money } from '../../domain/value-objects/Money';
import { Result } from '../../shared/Result';
import { DomainError, InvalidCashShiftStateError } from '../../shared/DomainError';
import { randomUUID } from 'node:crypto';

export interface OpenCashShiftInputDTO {
  openedByUserId: string;
  initialCents: number;
  notes?: string;
}

export interface OpenCashShiftOutputDTO {
  shiftId: string;
  openedByUserId: string;
  openedAt: Date;
  initialAmountFormatted: string;
  status: string;
}

export class OpenCashShiftUseCase {
  constructor(private cashShiftRepo: ICashShiftRepository) {}

  async execute(request: OpenCashShiftInputDTO): Promise<Result<OpenCashShiftOutputDTO, DomainError>> {
    // 1. Verificar se já existe um caixa ABERTO
    const currentActive = await this.cashShiftRepo.findCurrentOpenShift();
    if (currentActive) {
      return Result.fail(
        new InvalidCashShiftStateError(
          `Já existe um turno de caixa ABERTO (ID: '${currentActive.id}'). Encerre o turno ativo antes de abrir um novo.`
        )
      );
    }

    if (request.initialCents < 0) {
      return Result.fail(new InvalidCashShiftStateError("O saldo inicial do caixa não pode ser negativo."));
    }

    // 2. Instanciar Agregado CashShift
    const shift = new CashShiftEntity({
      id: randomUUID(),
      openedByUserId: request.openedByUserId,
      openedAt: new Date(),
      initialAmount: Money.fromCents(request.initialCents),
      notes: request.notes
    });

    // 3. Persistir no banco de dados
    await this.cashShiftRepo.save(shift);

    return Result.ok({
      shiftId: shift.id,
      openedByUserId: shift.openedByUserId,
      openedAt: shift.openedAt,
      initialAmountFormatted: shift.initialAmount.formatBRL(),
      status: shift.status
    });
  }
}
