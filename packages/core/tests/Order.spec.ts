import { describe, it, expect } from 'vitest';
import { OrderEntity, OrderItem } from '../src/domain/entities/Order';
import { Money } from '../src/domain/value-objects/Money';

describe('Agregado de Domínio: Order (Máquina de Estados de Pedidos e KDS)', () => {
  const createSampleItem = (priceCents: number = 2500, qty: number = 2) => new OrderItem({
    id: 'item-1',
    productId: 'prod-pastel-carne',
    productName: 'Pastel Especial de Carne',
    quantity: qty,
    unitPrice: Money.fromCents(priceCents),
    assemblies: [
      { id: 'opt-queijo', name: 'Catupiry Extra', priceAdjustment: Money.fromCents(300), quantity: 1 }
    ]
  });

  it('deve calcular o valor subtotal e total com base na quantidade e adicionais', () => {
    const item = createSampleItem(2500, 2); // Base R$ 25,00 + R$ 3,00 = R$ 28,00 x 2 = R$ 56,00
    expect(item.calculateTotal().getCents()).toBe(5600);

    const order = new OrderEntity({
      id: 'order-1',
      orderNumber: 101,
      type: 'BALCAO',
      paymentMethod: 'PIX',
      shiftId: 'shift-1',
      deliveryFee: Money.fromCents(500), // R$ 5,00
      discountAmount: Money.fromCents(600), // R$ 6,00
      items: [item]
    });

    // Subtotal: 5600 | entrega: 500 | desconto: 600 => Total = 5500 (R$ 55,00)
    expect(order.subtotal.getCents()).toBe(5600);
    expect(order.totalAmount.getCents()).toBe(5500);
  });

  it('deve validar transições válidas e barrar transições inválidas no KDS', () => {
    const order = new OrderEntity({
      id: 'order-2',
      orderNumber: 102,
      type: 'SALAO',
      paymentMethod: 'CARTAO_CREDITO',
      shiftId: 'shift-1',
      items: [createSampleItem()]
    });

    expect(order.status).toBe('PENDENTE');

    // PENDENTE -> RECEBIDO (Ok)
    const step1 = order.advanceStatus('RECEBIDO');
    expect(step1.isSuccess).toBe(true);
    expect(order.status).toBe('RECEBIDO');

    // RECEBIDO -> EM_PREPARO (Ok)
    const step2 = order.advanceStatus('EM_PREPARO');
    expect(step2.isSuccess).toBe(true);
    expect(order.status).toBe('EM_PREPARO');

    // EM_PREPARO -> ENTREGUE (Ilegal! Deve passar por PRONTO antes)
    const illegalStep = order.advanceStatus('ENTREGUE');
    expect(illegalStep.isFailure).toBe(true);
    expect(illegalStep.getError().message).toContain('Transição de status ilegal');
    expect(order.status).toBe('EM_PREPARO');

    // EM_PREPARO -> PRONTO -> ENTREGUE (Ok)
    expect(order.advanceStatus('PRONTO').isSuccess).toBe(true);
    expect(order.advanceStatus('ENTREGUE').isSuccess).toBe(true);
    expect(order.status).toBe('ENTREGUE');
  });

  it('não deve permitir cancelar um pedido que já foi ENTREGUE', () => {
    const order = new OrderEntity({
      id: 'order-3',
      orderNumber: 103,
      type: 'DELIVERY',
      paymentMethod: 'DINHEIRO',
      shiftId: 'shift-1',
      items: [createSampleItem()]
    });

    order.advanceStatus('RECEBIDO');
    order.advanceStatus('EM_PREPARO');
    order.advanceStatus('PRONTO');
    order.advanceStatus('SAIU_PARA_ENTREGA');
    order.advanceStatus('ENTREGUE');

    const cancelRes = order.cancel('Cliente desistiu');
    expect(cancelRes.isFailure).toBe(true);
    expect(cancelRes.getError().message).toContain('já foi ENTREGUE');
    expect(order.status).toBe('ENTREGUE');
  });

  it('deve exigir motivo de cancelamento não vazio para cancelar pedidos pendentes ou em preparo', () => {
    const order = new OrderEntity({
      id: 'order-4',
      orderNumber: 104,
      type: 'DELIVERY',
      paymentMethod: 'PIX',
      shiftId: 'shift-1',
      items: [createSampleItem()]
    });

    const emptyCancel = order.cancel('   ');
    expect(emptyCancel.isFailure).toBe(true);
    expect(emptyCancel.getError().message).toContain('motivo');

    const validCancel = order.cancel('Ingrediente esgotado na cozinha');
    expect(validCancel.isSuccess).toBe(true);
    expect(order.status).toBe('CANCELADO');
    expect(order.cancellationReason).toBe('Ingrediente esgotado na cozinha');
  });
});
