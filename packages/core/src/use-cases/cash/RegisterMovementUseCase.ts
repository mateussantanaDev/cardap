import { ICashShiftRepository } from '../../domain/repositories/ICashShiftRepository';
import { Money } from '../../domain/value-objects/Money';
import { Result } from '../../shared/Result';
import { DomainError, InvalidCashShiftStateError } from '../../shared/DomainError';
import { randomUUID } from 'node:crypto';

export type MovementType = 'SANGRIA' | 'SUPRIMENTO';

export interface RegisterMovementInputDTO {
  shiftId: string;
  userId: string;
  type: MovementType;
  amountCents: number;
  description: string;
}

export interface RegisterMovementOutputDTO {
  transactionId: string;
  shiftId: string;
  type: MovementType;
  amountFormatted: string;
  currentDrawerBalanceFormatted: string;
  createdAt: Date;
}

export class RegisterMovementUseCase {
  constructor(private cashShiftRepo: ICashShiftRepository) {}

  async execute(request: RegisterMovementInputDTO): Promise<Result<RegisterMovementOutputDTO, DomainError>> {
    const shift = await this.cashShiftRepo.findById(request.shiftId);
    if (!shift) {
      return Result.fail(new InvalidCashShiftStateError(`Turno de caixa com ID '${request.shiftId}' não encontrado.`));
    }

    if (shift.status === 'FECHADO') {
      return Result.fail(new InvalidCashShiftStateError("Não é possível realizar sangria/suprimento em um caixa FECHADO."));
    }

    const amount = Money.fromCents(request.amountCents);
    const txId = randomUUID();

    let txResult;
    if (request.type === 'SANGRIA') {
      txResult = shift.registerSangria(request.userId, amount, request.description, txId);
    } else {
      txResult = shift.registerSuprimento(request.userId, amount, request.description, txId);
    }

    if (txResult.isFailure) {
      return Result.fail(txResult.getError());
    }

    // Persistir alterações no banco
    await this.cashShiftRepo.save(shift);

    const currentBalance = shift.calculateCurrentCashInDrawer();

    return Result.ok({
      transactionId: txId,
      shiftId: shift.id,
      type: request.type,
      amountFormatted: amount.formatBRL(),
      currentDrawerBalanceFormatted: currentBalance.formatBRL(),
      createdAt: new Date()
    });
  }
}
