import { describe, it, expect } from 'vitest';
import { CashShiftEntity } from '../src/domain/entities/CashShift';
import { Money } from '../src/domain/value-objects/Money';

describe('Agregado de Domínio: CashShift (Turno de Caixa)', () => {
  it('deve abrir um turno de caixa com saldo inicial correto e status ABERTO', () => {
    const shift = new CashShiftEntity({
      id: 'shift-1001',
      openedByUserId: 'user-caixa-1',
      initialAmount: Money.fromCents(10000) // R$ 100,00
    });

    expect(shift.id).toBe('shift-1001');
    expect(shift.status).toBe('ABERTO');
    expect(shift.initialAmount.getCents()).toBe(10000);
    expect(shift.calculateCurrentCashInDrawer().getCents()).toBe(10000);
  });

  it('deve registrar suprimentos e sangrias atualizando o saldo disponível na gaveta', () => {
    const shift = new CashShiftEntity({
      id: 'shift-1001',
      openedByUserId: 'user-caixa-1',
      initialAmount: Money.fromCents(10000) // R$ 100,00
    });

    // Suprimento de R$ 50,00
    const suprimentoRes = shift.registerSuprimento('user-caixa-1', Money.fromCents(5000), 'Troco adicional', 'tx-1');
    expect(suprimentoRes.isSuccess).toBe(true);
    expect(shift.calculateCurrentCashInDrawer().getCents()).toBe(15000);

    // Entrada de Pedido em Dinheiro de R$ 30,00
    const orderRes = shift.registerOrderPayment('user-caixa-1', 'order-55', Money.fromCents(3000), 'tx-2');
    expect(orderRes.isSuccess).toBe(true);
    expect(shift.calculateCurrentCashInDrawer().getCents()).toBe(18000);

    // Sangria de R$ 40,00
    const sangriaRes = shift.registerSangria('user-caixa-1', Money.fromCents(4000), 'Retirada de segurança', 'tx-3');
    expect(sangriaRes.isSuccess).toBe(true);
    expect(shift.calculateCurrentCashInDrawer().getCents()).toBe(14000); // 180,00 - 40,00 = 140,00
  });

  it('deve rejeitar sangria maior do que o saldo atual disponível em gaveta (Proteção de Saldo)', () => {
    const shift = new CashShiftEntity({
      id: 'shift-1001',
      openedByUserId: 'user-caixa-1',
      initialAmount: Money.fromCents(5000) // R$ 50,00
    });

    const sangriaRes = shift.registerSangria('user-caixa-1', Money.fromCents(10000), 'Sangria excessiva', 'tx-4');
    expect(sangriaRes.isFailure).toBe(true);
    expect(sangriaRes.getError().message).toContain('Saldo em dinheiro insuficiente');
    expect(shift.calculateCurrentCashInDrawer().getCents()).toBe(5000);
  });

  it('deve realizar o Fechamento Cego com cálculo exato de quebra e sobra de caixa', () => {
    const shift = new CashShiftEntity({
      id: 'shift-1001',
      openedByUserId: 'user-caixa-1',
      initialAmount: Money.fromCents(10000) // R$ 100,00
    });

    shift.registerSuprimento('user-caixa-1', Money.fromCents(5000), 'Reforço', 'tx-1'); // Total esperado = R$ 150,00 (15000 centavos)

    // Operador relata contagem cega de R$ 145,00 (falta/quebra de R$ 5,00)
    const closeRes = shift.closeBlind('user-gerente-1', Money.fromCents(14500), 'Divergência de troco');

    expect(closeRes.isSuccess).toBe(true);
    const data = closeRes.getValue();
    expect(shift.status).toBe('FECHADO');
    expect(data.expectedFinalAmount.getCents()).toBe(15000);
    expect(data.actualFinalAmount.getCents()).toBe(14500);
    expect(data.differenceAmount.getCents()).toBe(-500); // Quebra de R$ 5,00
  });

  it('não deve permitir nenhuma movimentação em caixa já fechado', () => {
    const shift = new CashShiftEntity({
      id: 'shift-1001',
      openedByUserId: 'user-caixa-1',
      initialAmount: Money.fromCents(10000)
    });

    shift.closeBlind('user-gerente-1', Money.fromCents(10000));

    const sangriaRes = shift.registerSangria('user-caixa-1', Money.fromCents(1000), 'Teste sangria', 'tx-99');
    expect(sangriaRes.isFailure).toBe(true);
    expect(sangriaRes.getError().message).toContain('FECHADO');
  });
});
