import { describe, it, expect } from 'vitest';
import { OpenCashShiftUseCase } from '../src/use-cases/cash/OpenCashShiftUseCase';
import { RegisterMovementUseCase } from '../src/use-cases/cash/RegisterMovementUseCase';
import { CloseBlindCashShiftUseCase } from '../src/use-cases/cash/CloseBlindCashShiftUseCase';
import { CashShiftEntity } from '../src/domain/entities/CashShift';
import { ICashShiftRepository } from '../src/domain/repositories/ICashShiftRepository';

class InMemoryCashShiftRepository implements ICashShiftRepository {
  private shifts: CashShiftEntity[] = [];

  async save(shift: CashShiftEntity): Promise<void> {
    const idx = this.shifts.findIndex(s => s.id === shift.id);
    if (idx >= 0) this.shifts[idx] = shift;
    else this.shifts.push(shift);
  }

  async findById(id: string): Promise<CashShiftEntity | null> {
    return this.shifts.find(s => s.id === id) || null;
  }

  async findCurrentOpenShift(): Promise<CashShiftEntity | null> {
    return this.shifts.find(s => s.status === 'ABERTO') || null;
  }

  async findShiftsByDateRange(startDate: Date, endDate: Date): Promise<CashShiftEntity[]> {
    return this.shifts.filter(s => s.openedAt >= startDate && s.openedAt <= endDate);
  }
}

describe('Etapa 2: Módulo Financeiro e Movimentações de Caixa', () => {
  it('deve abrir um caixa com saldo inicial positivo', async () => {
    const repo = new InMemoryCashShiftRepository();
    const useCase = new OpenCashShiftUseCase(repo);

    const result = await useCase.execute({
      openedByUserId: 'user-caixa-1',
      initialCents: 15000, // R$ 150,00
      notes: 'Abertura turno noite'
    });

    expect(result.isSuccess).toBe(true);
    const data = result.getValue();
    expect(data.initialAmountFormatted).toBe('R$ 150,00');
    expect(data.status).toBe('ABERTO');

    const active = await repo.findCurrentOpenShift();
    expect(active).not.toBeNull();
    expect(active?.initialAmount.getCents()).toBe(15000);
  });

  it('deve recusar abrir um novo caixa se já houver um turno ABERTO', async () => {
    const repo = new InMemoryCashShiftRepository();
    const openUseCase = new OpenCashShiftUseCase(repo);

    await openUseCase.execute({ openedByUserId: 'user-caixa-1', initialCents: 10000 });

    // Segunda tentativa de abertura
    const secondResult = await openUseCase.execute({ openedByUserId: 'user-caixa-2', initialCents: 5000 });

    expect(secondResult.isFailure).toBe(true);
    expect(secondResult.getError().message).toContain('Já existe um turno de caixa ABERTO');
  });

  it('deve registrar Sangria e Suprimento atualizando o saldo real da gaveta', async () => {
    const repo = new InMemoryCashShiftRepository();
    const openUseCase = new OpenCashShiftUseCase(repo);
    const movementUseCase = new RegisterMovementUseCase(repo);

    const openRes = await openUseCase.execute({ openedByUserId: 'user-caixa-1', initialCents: 10000 }); // R$ 100,00
    const shiftId = openRes.getValue().shiftId;

    // Registrar Suprimento de R$ 50,00
    const suprimentoRes = await movementUseCase.execute({
      shiftId,
      userId: 'user-caixa-1',
      type: 'SUPRIMENTO',
      amountCents: 5000,
      description: 'Reforço de moeda de R$ 1,00'
    });

    expect(suprimentoRes.isSuccess).toBe(true);
    expect(suprimentoRes.getValue().currentDrawerBalanceFormatted).toBe('R$ 150,00');

    // Registrar Sangria de R$ 30,00
    const sangriaRes = await movementUseCase.execute({
      shiftId,
      userId: 'user-caixa-1',
      type: 'SANGRIA',
      amountCents: 3000,
      description: 'Retirada de cédulas de R$ 100 para o cofre'
    });

    expect(sangriaRes.isSuccess).toBe(true);
    expect(sangriaRes.getValue().currentDrawerBalanceFormatted).toBe('R$ 120,00');
  });

  it('deve bloquear sangria superior ao saldo disponível na gaveta', async () => {
    const repo = new InMemoryCashShiftRepository();
    const openUseCase = new OpenCashShiftUseCase(repo);
    const movementUseCase = new RegisterMovementUseCase(repo);

    const openRes = await openUseCase.execute({ openedByUserId: 'user-caixa-1', initialCents: 5000 }); // R$ 50,00
    const shiftId = openRes.getValue().shiftId;

    const sangriaExcessiva = await movementUseCase.execute({
      shiftId,
      userId: 'user-caixa-1',
      type: 'SANGRIA',
      amountCents: 20000, // Solicitando R$ 200,00 mas só tem R$ 50,00
      description: 'Sangria excessiva'
    });

    expect(sangriaExcessiva.isFailure).toBe(true);
    expect(sangriaExcessiva.getError().message).toContain('insuficiente');
  });
});
