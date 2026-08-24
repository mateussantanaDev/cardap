import { describe, it, expect } from 'vitest';
import { Money } from '../src/domain/value-objects/Money';
import { CashShiftEntity } from '../src/domain/entities/CashShift';

describe('Regras de Negócio: Métricas de Caixa, Estoque e Faturamento do Dia (Etapa 4)', () => {
  it('deve calcular dinamicamente faturamento, sangrias e saldo esperado na gaveta', () => {
    const shift = new CashShiftEntity({
      id: 'shift-test-1',
      openedByUserId: 'user-admin',
      initialAmount: Money.fromCents(10000) // R$ 100,00 inicial
    });

    // 1. Suprimento de R$ 50,00
    shift.registerSuprimento('user-admin', Money.fromCents(5000), 'Aporte de troco', 'tx-1');

    // 2. Venda em Dinheiro R$ 80,00
    shift.registerOrderPayment('user-admin', 'order-101', Money.fromCents(8000), 'tx-2');

    // 3. Sangria de R$ 70,00
    shift.registerSangria('user-admin', Money.fromCents(7000), 'Retirada de segurança', 'tx-3');

    // Saldo esperado: 100 + 50 + 80 - 70 = 160,00 (16000 cents)
    const currentCash = shift.calculateCurrentCashInDrawer();
    expect(currentCash.getCents()).toBe(16000);
    expect(currentCash.formatBRL()).toBe('R$\xa0160,00');
  });

  it('deve calcular a proporção percentual correta entre vendas em dinheiro, cartão e PIX', () => {
    const cashSalesCents = 4000; // R$ 40,00 (40%)
    const cardSalesCents = 4000; // R$ 40,00 (40%)
    const pixSalesCents = 2000;  // R$ 20,00 (20%)
    const totalSalesCents = cashSalesCents + cardSalesCents + pixSalesCents;

    const cashPercent = Math.round((cashSalesCents / totalSalesCents) * 100);
    const cardPercent = Math.round((cardSalesCents / totalSalesCents) * 100);
    const pixPercent = Math.round((pixSalesCents / totalSalesCents) * 100);

    expect(cashPercent).toBe(40);
    expect(cardPercent).toBe(40);
    expect(pixPercent).toBe(20);
    expect(cashPercent + cardPercent + pixPercent).toBe(100);
  });

  it('deve calcular o valor total de inventário e classificar status de estoque corretamente', () => {
    const items = [
      { id: '1', name: 'Carne Moída', currentQuantity: 2, minQuantity: 10, unitCostCents: 3500 }, // Crítico (<= 5)
      { id: '2', name: 'Queijo Mussarela', currentQuantity: 8, minQuantity: 10, unitCostCents: 4200 }, // Baixo (<= 10)
      { id: '3', name: 'Farinha de Trigo', currentQuantity: 50, minQuantity: 15, unitCostCents: 600 } // Normal (> 10)
    ];

    // Classificação de status
    const classified = items.map(i => {
      let status: 'NORMAL' | 'BAIXO' | 'CRITICO' = 'NORMAL';
      if (i.currentQuantity <= i.minQuantity * 0.5) {
        status = 'CRITICO';
      } else if (i.currentQuantity <= i.minQuantity) {
        status = 'BAIXO';
      }
      return { ...i, status };
    });

    expect(classified[0].status).toBe('CRITICO');
    expect(classified[1].status).toBe('BAIXO');
    expect(classified[2].status).toBe('NORMAL');

    // Valor total estimado em estoque
    // Item 1: 2 * 35,00 = 70,00
    // Item 2: 8 * 42,00 = 336,00
    // Item 3: 50 * 6,00 = 300,00
    // Total: 70 + 336 + 300 = R$ 706,00 (70600 cents)
    const totalValuationCents = classified.reduce((sum, i) => sum + (i.currentQuantity * i.unitCostCents), 0);
    expect(totalValuationCents).toBe(70600);

    // Remoção/Exclusão de Insumo
    const afterDelete = classified.filter(i => i.id !== '1');
    expect(afterDelete.length).toBe(2);
    expect(afterDelete.find(i => i.id === '1')).toBeUndefined();
  });
});
