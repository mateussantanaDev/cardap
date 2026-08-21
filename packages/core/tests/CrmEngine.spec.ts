import { describe, it, expect } from 'vitest';
import { CustomerEntity } from '../src/domain/entities/CustomerEntity';
import { ProcessCrmWebhookUseCase } from '../src/use-cases/crm/ProcessCrmWebhookUseCase';
import { SendOrderWhatsAppNotificationUseCase } from '../src/use-cases/crm/SendOrderWhatsAppNotificationUseCase';
import { GetCrmCustomerListUseCase } from '../src/use-cases/crm/GetCrmCustomerListUseCase';
import { ICustomerRepository, CustomerMessageData } from '../src/domain/repositories/ICustomerRepository';
import { IOrderRepository, OrderFilterParams } from '../src/domain/repositories/IOrderRepository';
import { OrderEntity, OrderItem } from '../src/domain/entities/Order';
import { Money } from '../src/domain/value-objects/Money';

class InMemoryCustomerRepository implements ICustomerRepository {
  private customers: CustomerEntity[] = [];
  private messages: CustomerMessageData[] = [];

  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    return this.customers.find(c => c.phone === phone) || null;
  }

  async findById(id: string): Promise<CustomerEntity | null> {
    return this.customers.find(c => c.id === id) || null;
  }

  async findAll(): Promise<CustomerEntity[]> {
    return this.customers;
  }

  async save(customer: CustomerEntity): Promise<void> {
    const idx = this.customers.findIndex(c => c.id === customer.id);
    if (idx >= 0) this.customers[idx] = customer;
    else this.customers.push(customer);
  }

  async logMessage(message: CustomerMessageData): Promise<void> {
    this.messages.push(message);
  }

  async getMessagesByCustomerId(customerId: string): Promise<CustomerMessageData[]> {
    return this.messages.filter(m => m.customerId === customerId);
  }
}

class MockOrderRepoForCrm implements IOrderRepository {
  private order: OrderEntity;
  constructor(order: OrderEntity) { this.order = order; }
  async findById(): Promise<OrderEntity | null> { return this.order; }
  async findByOrderNumber(): Promise<OrderEntity | null> { return this.order; }
  async findActiveByTableId(): Promise<OrderEntity[]> { return []; }
  async findKdsActiveOrders(): Promise<OrderEntity[]> { return []; }
  async findMany(): Promise<OrderEntity[]> { return []; }
  async save(): Promise<void> {}
  async getNextDailyOrderNumber(): Promise<number> { return 101; }
}

describe('Etapa 2 CRM: Domínio, Webhooks, LTV e Notificações de WhatsApp', () => {
  it('deve calcular LTV, ticket médio e atrelar tags automáticas (VIP, RECORRENTE) ao cliente', () => {
    const customer = new CustomerEntity({
      id: 'cust-1',
      phone: '5511999999999',
      name: 'Cliente Teste'
    });

    expect(customer.tags).toContain('NOVO');

    // Registrar 3 compras acumulando R$ 250,00 (25000 centavos)
    customer.registerPurchase(10000); // R$ 100
    customer.registerPurchase(10000); // R$ 100
    customer.registerPurchase(5000);  // R$ 50

    expect(customer.totalOrdersCount).toBe(3);
    expect(customer.totalSpentCents).toBe(25000);
    expect(customer.lifetimeValue.formatBRL()).toBe('R$ 250,00');
    expect(customer.averageTicket.formatBRL()).toBe('R$ 83,33');
    expect(customer.tags).toContain('VIP');
    expect(customer.tags).toContain('RECORRENTE');
  });

  it('deve processar webhook do Evo CRM e cadastrar mensagem e cliente automaticamente', async () => {
    const custRepo = new InMemoryCustomerRepository();
    const webhookUseCase = new ProcessCrmWebhookUseCase(custRepo);

    const result = await webhookUseCase.execute({
      event: 'messages.upsert',
      instanceId: 'evo-inst-01',
      data: {
        remoteJid: '5511999999999@s.whatsapp.net',
        phone: '5511999999999',
        pushName: 'Cliente Teste',
        messageText: 'Olá, gostaria de saber se meu pedido já saiu!',
        fromMe: false
      }
    });

    expect(result.isSuccess).toBe(true);

    const created = await custRepo.findByPhone('5511999999999');
    expect(created).not.toBeNull();
    expect(created?.name).toBe('Cliente Teste');

    const msgs = await custRepo.getMessagesByCustomerId(created!.id);
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toContain('gostaria de saber');
  });

  it('deve gerar notificação formatada de atualização de pedido para WhatsApp', async () => {
    const custRepo = new InMemoryCustomerRepository();
    const customer = new CustomerEntity({
      id: 'cust-77',
      phone: '5511999999999',
      name: 'Cliente Teste'
    });
    await custRepo.save(customer);

    const sampleOrder = new OrderEntity({
      id: 'ord-46902',
      orderNumber: 46902,
      type: 'DELIVERY',
      paymentMethod: 'CARTAO_DEBITO',
      shiftId: 'shift-1',
      customerId: 'cust-77',
      status: 'EM_PREPARO',
      items: [
        new OrderItem({
          id: 'it-1',
          productId: 'p-1',
          productName: 'Pizza PP Calabresa',
          quantity: 1,
          unitPrice: Money.fromCents(2000)
        })
      ]
    });

    const orderRepo = new MockOrderRepoForCrm(sampleOrder);
    const notifyUseCase = new SendOrderWhatsAppNotificationUseCase(orderRepo, custRepo);

    const result = await notifyUseCase.execute({ orderId: 'ord-46902' });
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().messageText).toContain('Em Preparo na Cozinha');
    expect(result.getValue().messageText).toContain('46902');
  });
});
