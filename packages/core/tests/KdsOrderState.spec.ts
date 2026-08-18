import { describe, it, expect } from 'vitest';
import { AdvanceKdsStatusUseCase } from '../src/use-cases/order/AdvanceKdsStatusUseCase';
import { CancelOrderUseCase } from '../src/use-cases/order/CancelOrderUseCase';
import { OrderEntity, OrderItem } from '../src/domain/entities/Order';
import { Money } from '../src/domain/value-objects/Money';
import { IOrderRepository, OrderFilterParams } from '../src/domain/repositories/IOrderRepository';

class InMemoryOrderRepository implements IOrderRepository {
  private orders: OrderEntity[] = [];

  async save(order: OrderEntity): Promise<void> {
    const idx = this.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) this.orders[idx] = order;
    else this.orders.push(order);
  }

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orders.find(o => o.id === id) || null;
  }

  async findByOrderNumber(orderNumber: number): Promise<OrderEntity | null> {
    return this.orders.find(o => o.orderNumber === orderNumber) || null;
  }

  async findActiveByTableId(tableId: string): Promise<OrderEntity[]> {
    return this.orders.filter(o => o.tableId === tableId && o.status !== 'ENTREGUE' && o.status !== 'CANCELADO');
  }

  async findKdsActiveOrders(): Promise<OrderEntity[]> {
    return this.orders.filter(o => ['RECEBIDO', 'EM_PREPARO', 'PRONTO'].includes(o.status));
  }

  async findMany(params: OrderFilterParams): Promise<OrderEntity[]> {
    return this.orders;
  }

  async getNextDailyOrderNumber(): Promise<number> {
    return this.orders.length + 101;
  }
}

describe('Etapa 3: Máquina de Estados KDS e Gestão de Pedidos', () => {
  const createSampleOrder = (id: string, orderNumber: number) => {
    return new OrderEntity({
      id,
      orderNumber,
      type: 'BALCAO',
      paymentMethod: 'PIX',
      shiftId: 'shift-1',
      items: [
        new OrderItem({
          id: 'item-1',
          productId: 'prod-pastel',
          productName: 'Pastel de Carne',
          quantity: 2,
          unitPrice: Money.fromCents(1500)
        })
      ]
    });
  };

  it('deve avançar o status do pedido no KDS sequencialmente (PENDENTE -> RECEBIDO -> EM_PREPARO -> PRONTO)', async () => {
    const repo = new InMemoryOrderRepository();
    const order = createSampleOrder('order-1', 101);
    await repo.save(order);

    const advanceUseCase = new AdvanceKdsStatusUseCase(repo);

    // 1. PENDENTE -> RECEBIDO
    const step1 = await advanceUseCase.execute({ orderId: 'order-1', nextStatus: 'RECEBIDO' });
    expect(step1.isSuccess).toBe(true);
    expect(step1.getValue().newStatus).toBe('RECEBIDO');

    // 2. RECEBIDO -> EM_PREPARO
    const step2 = await advanceUseCase.execute({ orderId: 'order-1', nextStatus: 'EM_PREPARO' });
    expect(step2.isSuccess).toBe(true);
    expect(step2.getValue().newStatus).toBe('EM_PREPARO');

    // 3. EM_PREPARO -> PRONTO
    const step3 = await advanceUseCase.execute({ orderId: 'order-1', nextStatus: 'PRONTO' });
    expect(step3.isSuccess).toBe(true);
    expect(step3.getValue().newStatus).toBe('PRONTO');
  });

  it('deve bloquear pular etapas ilegais no KDS (ex: RECEBIDO -> ENTREGUE sem passar por EM_PREPARO)', async () => {
    const repo = new InMemoryOrderRepository();
    const order = createSampleOrder('order-2', 102);
    await repo.save(order);

    const advanceUseCase = new AdvanceKdsStatusUseCase(repo);
    await advanceUseCase.execute({ orderId: 'order-2', nextStatus: 'RECEBIDO' });

    // Tentativa ilegal
    const illegalStep = await advanceUseCase.execute({ orderId: 'order-2', nextStatus: 'ENTREGUE' });
    expect(illegalStep.isFailure).toBe(true);
    expect(illegalStep.getError().message).toContain('Transição de status ilegal');
  });

  it('deve cancelar um pedido pendente ou em preparo fornecendo o motivo', async () => {
    const repo = new InMemoryOrderRepository();
    const order = createSampleOrder('order-3', 103);
    await repo.save(order);

    const cancelUseCase = new CancelOrderUseCase(repo);
    const result = await cancelUseCase.execute({
      orderId: 'order-3',
      reason: 'Cliente cancelou antes do preparo'
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().status).toBe('CANCELADO');
    expect(result.getValue().reason).toBe('Cliente cancelou antes do preparo');
  });
});
