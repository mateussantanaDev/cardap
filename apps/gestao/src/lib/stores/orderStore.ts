import { writable } from 'svelte/store';

export interface KdsItemOption {
  id: string;
  name: string;
  quantity: number;
}

export interface KdsOrderItem {
  id: string;
  productName: string;
  quantity: number;
  notes?: string;
  modifiers?: KdsItemOption[];
  assemblies?: KdsItemOption[];
  complements?: KdsItemOption[];
}

export interface KdsOrder {
  id: string;
  orderNumber: number;
  type: 'SALAO' | 'BALCAO' | 'DELIVERY';
  status: 'PENDENTE' | 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';
  tableNumber?: number;
  totalAmountFormatted: string;
  totalAmountCents: number;
  createdAt: Date;
  slaMinutes: number;
  items: KdsOrderItem[];
}

const initialOrders: KdsOrder[] = [];

function createOrderStore() {
  const { subscribe, set, update } = writable<KdsOrder[]>(initialOrders);

  return {
    subscribe,
    setOrders: (orders: KdsOrder[]) => set(orders),
    addOrder: (newOrder: KdsOrder) =>
      update(orders => [newOrder, ...orders]),
    updateStatus: (orderId: string, nextStatus: KdsOrder['status']) =>
      update(orders =>
        orders.map(order =>
          order.id === orderId ? { ...order, status: nextStatus } : order
        )
      ),
    removeOrder: (orderId: string) =>
      update(orders => orders.filter(o => o.id !== orderId))
  };
}

export const orderStore = createOrderStore();
