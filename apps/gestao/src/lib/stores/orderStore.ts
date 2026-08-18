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

const initialOrders: KdsOrder[] = [
  {
    id: 'ord-101',
    orderNumber: 101,
    type: 'SALAO',
    status: 'EM_PREPARO',
    tableNumber: 3,
    totalAmountFormatted: 'R$ 84,50',
    totalAmountCents: 8450,
    createdAt: new Date(Date.now() - 18 * 60 * 1000), // Criado há 18 minutos (Atrasado!)
    slaMinutes: 15,
    items: [
      {
        id: 'item-1',
        productName: 'Monte seu Pastel (20cm)',
        quantity: 2,
        assemblies: [
          { id: 'opt-1', name: 'Massa Tradicional', quantity: 1 },
          { id: 'opt-2', name: 'Carne Moída Prime', quantity: 1 },
          { id: 'opt-3', name: 'Queijo Catupiry Original', quantity: 1 }
        ],
        notes: 'Fritar bem crocante'
      },
      {
        id: 'item-2',
        productName: 'Guaraná Antarctica 350ml',
        quantity: 2
      }
    ]
  },
  {
    id: 'ord-102',
    orderNumber: 102,
    type: 'BALCAO',
    status: 'EM_PREPARO',
    tableNumber: undefined,
    totalAmountFormatted: 'R$ 38,00',
    totalAmountCents: 3800,
    createdAt: new Date(Date.now() - 8 * 60 * 1000), // Criado há 8 minutos
    slaMinutes: 15,
    items: [
      {
        id: 'item-3',
        productName: 'Pastel de Frango com Catupiry',
        quantity: 2,
        notes: 'Sem azeitona'
      }
    ]
  },
  {
    id: 'ord-103',
    orderNumber: 103,
    type: 'DELIVERY',
    status: 'RECEBIDO',
    tableNumber: undefined,
    totalAmountFormatted: 'R$ 96,00',
    totalAmountCents: 9600,
    createdAt: new Date(Date.now() - 3 * 60 * 1000), // Criado há 3 minutos
    slaMinutes: 20,
    items: [
      {
        id: 'item-4',
        productName: 'Pastel de Carne com Queijo',
        quantity: 3
      },
      {
        id: 'item-5',
        productName: 'Caldo de Cana 500ml',
        quantity: 2,
        notes: 'Com gelo e limão'
      }
    ]
  },
  {
    id: 'ord-104',
    orderNumber: 104,
    type: 'SALAO',
    status: 'PRONTO',
    tableNumber: 5,
    totalAmountFormatted: 'R$ 52,00',
    totalAmountCents: 5200,
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
    slaMinutes: 15,
    items: [
      {
        id: 'item-6',
        productName: 'Pastel Doce de Romeu e Julieta',
        quantity: 2
      }
    ]
  }
];

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
