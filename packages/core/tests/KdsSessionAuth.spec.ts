import { describe, it, expect } from 'vitest';
import { AuthenticateUserUseCase } from '../src/use-cases/auth/AuthenticateUserUseCase';
import { AdvanceKdsStatusUseCase } from '../src/use-cases/order/AdvanceKdsStatusUseCase';
import { UserEntity } from '../src/domain/entities/UserEntity';
import { OrderEntity, OrderItem } from '../src/domain/entities/Order';
import { Money } from '../src/domain/value-objects/Money';
import { SecurityGuard } from '../src/shared/SecurityGuard';
import { IUserRepository, UserSessionData } from '../src/domain/repositories/IUserRepository';
import { IOrderRepository, OrderFilterParams } from '../src/domain/repositories/IOrderRepository';

class MockUserRepository implements IUserRepository {
  private users: UserEntity[] = [];
  private sessions: UserSessionData[] = [];

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.find(u => u.email === email.toLowerCase().trim()) || null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async save(user: UserEntity): Promise<void> {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) this.users[idx] = user;
    else this.users.push(user);
  }

  async createSession(session: UserSessionData): Promise<void> {
    this.sessions.push(session);
  }

  async findSessionByToken(token: string): Promise<{ user: UserEntity; expiresAt: Date } | null> {
    const session = this.sessions.find(s => s.token === token);
    if (!session || session.expiresAt < new Date()) return null;
    const user = await this.findById(session.userId);
    if (!user) return null;
    return { user, expiresAt: session.expiresAt };
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions = this.sessions.filter(s => s.token !== token);
  }
}

class MockOrderRepository implements IOrderRepository {
  private orders: OrderEntity[] = [];

  async save(order: OrderEntity): Promise<void> {
    const idx = this.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) this.orders[idx] = order;
    else this.orders.push(order);
  }

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orders.find(o => o.id === id || String(o.orderNumber) === id) || null;
  }

  async findByOrderNumber(orderNumber: number): Promise<OrderEntity | null> {
    return this.orders.find(o => o.orderNumber === orderNumber) || null;
  }

  async findActiveByTableId(tableId: string): Promise<OrderEntity[]> {
    return this.orders.filter(o => o.tableId === tableId && o.status !== 'ENTREGUE' && o.status !== 'CANCELADO');
  }

  async findKdsActiveOrders(): Promise<OrderEntity[]> {
    return this.orders.filter(o => ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'].includes(o.status));
  }

  async findMany(params: OrderFilterParams): Promise<OrderEntity[]> {
    return this.orders;
  }

  async getNextDailyOrderNumber(): Promise<number> {
    return this.orders.length + 101;
  }
}

describe('Etapa 1: Validação de Autenticação, Sessões de 30 Dias e KDS 401 Fix', () => {
  it('deve emitir sessão válida de 30 dias contínuos no login', async () => {
    const userRepo = new MockUserRepository();
    const user = new UserEntity({
      id: 'cozinha-user-1',
      name: 'Chef da Cozinha',
      email: 'cozinha@imperius.com.br',
      passwordHash: UserEntity.hashPassword('cozinha123'),
      role: 'COZINHA',
      isActive: true
    });
    await userRepo.save(user);

    const authUseCase = new AuthenticateUserUseCase(userRepo);
    const authResult = await authUseCase.execute({
      email: 'cozinha@imperius.com.br',
      password: 'cozinha123'
    });

    expect(authResult.isSuccess).toBe(true);
    const session = authResult.getValue();

    // Validar expiração mínima de 29 dias no futuro
    const daysUntilExpiry = (session.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysUntilExpiry).toBeGreaterThan(29);
    expect(session.user.role).toBe('COZINHA');
  });

  it('deve autorizar perfil COZINHA e ADMIN a avançar status no KDS via SecurityGuard', () => {
    const cozinhaAuth = SecurityGuard.authorize('COZINHA', 'ADVANCE_KDS_STATUS');
    expect(cozinhaAuth.isSuccess).toBe(true);

    const adminAuth = SecurityGuard.authorize('ADMIN', 'ADVANCE_KDS_STATUS');
    expect(adminAuth.isSuccess).toBe(true);

    const gerenteAuth = SecurityGuard.authorize('GERENTE', 'ADVANCE_KDS_STATUS');
    expect(gerenteAuth.isSuccess).toBe(true);

    const caixaAuth = SecurityGuard.authorize('CAIXA', 'ADVANCE_KDS_STATUS');
    expect(caixaAuth.isSuccess).toBe(true);
  });

  it('deve avançar status de RECEBIDO para EM_PREPARO e PRONTO sem reverter para RECEBIDO', async () => {
    const orderRepo = new MockOrderRepository();
    const order = new OrderEntity({
      id: 'order-kds-test-1',
      orderNumber: 47101,
      type: 'DELIVERY',
      paymentMethod: 'PIX',
      shiftId: 'shift-1',
      items: [
        new OrderItem({
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Pastel Gigante Especial',
          quantity: 1,
          unitPrice: Money.fromCents(2800)
        })
      ]
    });
    // Status inicial do pedido ao chegar
    order.advanceStatus('RECEBIDO');
    await orderRepo.save(order);

    const advanceUseCase = new AdvanceKdsStatusUseCase(orderRepo);

    // Iniciar preparo
    const prepResult = await advanceUseCase.execute({
      orderId: 'order-kds-test-1',
      nextStatus: 'EM_PREPARO'
    });
    expect(prepResult.isSuccess).toBe(true);
    expect(prepResult.getValue().newStatus).toBe('EM_PREPARO');

    // Verificar se no repositório o status permanece EM_PREPARO
    const updatedOrder = await orderRepo.findById('order-kds-test-1');
    expect(updatedOrder?.status).toBe('EM_PREPARO');

    // Simular polling subsequente do KDS: a fila deve conter o pedido em EM_PREPARO e não RECEBIDO
    const kdsQueue = await orderRepo.findKdsActiveOrders();
    const orderInQueue = kdsQueue.find(o => o.id === 'order-kds-test-1');
    expect(orderInQueue?.status).toBe('EM_PREPARO');

    // Marcar como pronto
    const readyResult = await advanceUseCase.execute({
      orderId: 'order-kds-test-1',
      nextStatus: 'PRONTO'
    });
    expect(readyResult.isSuccess).toBe(true);
    expect(readyResult.getValue().newStatus).toBe('PRONTO');

    // Verificar persistência final
    const finalOrder = await orderRepo.findById('order-kds-test-1');
    expect(finalOrder?.status).toBe('PRONTO');
  });
});
