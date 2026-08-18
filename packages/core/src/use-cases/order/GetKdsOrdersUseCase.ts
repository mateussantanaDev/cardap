import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderStatus, OrderType } from '../../domain/entities/Order';

export interface KdsOrderOutputItem {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  totalAmountFormatted: string;
  totalAmountCents: number;
  createdAt: Date;
  slaMinutes: number;
  elapsedMinutes: number;
  isDelayed: boolean;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    notes?: string;
    modifiers: Array<{ id: string; name: string; quantity: number }>;
    assemblies: Array<{ id: string; name: string; quantity: number }>;
    complements: Array<{ id: string; name: string; quantity: number }>;
  }>;
}

export class GetKdsOrdersUseCase {
  constructor(private orderRepo: IOrderRepository) {}

  async execute(): Promise<KdsOrderOutputItem[]> {
    const orders = await this.orderRepo.findKdsActiveOrders();
    const now = Date.now();

    return orders.map(order => {
      const elapsedMinutes = Math.floor((now - order.createdAt.getTime()) / (1000 * 60));
      const slaMinutes = order.type === 'DELIVERY' ? 25 : 15;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        status: order.status,
        tableId: order.tableId,
        totalAmountFormatted: order.totalAmount.formatBRL(),
        totalAmountCents: order.totalAmount.getCents(),
        createdAt: order.createdAt,
        slaMinutes,
        elapsedMinutes,
        isDelayed: elapsedMinutes > slaMinutes,
        items: order.items.map(item => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers.map(m => ({ id: m.id, name: m.name, quantity: m.quantity })),
          assemblies: item.assemblies.map(a => ({ id: a.id, name: a.name, quantity: a.quantity })),
          complements: item.complements.map(c => ({ id: c.id, name: c.name, quantity: c.quantity }))
        }))
      };
    });
  }
}
