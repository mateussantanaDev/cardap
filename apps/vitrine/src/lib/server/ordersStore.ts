import { QrTableToken } from '@cardap/core';

export interface CatalogOption {
  id: string;
  name: string;
  priceAdjustmentCents: number;
}

export interface CatalogGroup {
  id: string;
  name: string;
  minChoices: number;
  maxChoices: number;
  isRequired: boolean;
  options: CatalogOption[];
}

export interface CatalogProduct {
  id: string;
  code: string;
  category: string;
  name: string;
  description: string;
  basePriceCents: number;
  originalPriceCents?: number;
  discountPercentage?: number;
  isBestSeller?: boolean;
  icon?: string;
  imageUrl?: string;
  isCustomizable?: boolean;
  assemblyGroups?: CatalogGroup[];
}

// Catálogo Oficial do Estabelecimento
export const SERVER_CATALOG: CatalogProduct[] = [
  {
    id: 'ent-01',
    code: 'ENT-01',
    category: 'ENTRADAS',
    name: 'Batata c/ Cheddar e Bacon',
    description: '250g de batata crocante e sequinha, com uma deliciosa cobertura de cheddar e bacon.',
    basePriceCents: 2400,
    isBestSeller: true,
    icon: 'fries',
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=400&q=80',
    isCustomizable: true,
    assemblyGroups: [
      {
        id: 'g-molho',
        name: 'MOLHO ADICIONAL',
        minChoices: 0,
        maxChoices: 1,
        isRequired: false,
        options: [
          { id: 'opt-m1', name: 'Maionese Especial da Casa', priceAdjustmentCents: 300 },
          { id: 'opt-m2', name: 'Molho Barbecue', priceAdjustmentCents: 300 }
        ]
      }
    ]
  },
  {
    id: 'ent-02',
    code: 'ENT-02',
    category: 'ENTRADAS',
    name: 'Batata Frita Tradicional',
    description: '250g Batata frita, crocante e sequinha.',
    basePriceCents: 1600,
    icon: 'fries',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'ent-03',
    code: 'ENT-03',
    category: 'ENTRADAS',
    name: 'Crispy De Queijo',
    description: '10 unidades de puro sabor, super crocantes por fora e com queijo derretendo por dentro.',
    basePriceCents: 2300,
    icon: 'cheese',
    imageUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=400&q=80',
    isBestSeller: true
  },
  {
    id: 'ent-04',
    code: 'ENT-04',
    category: 'ENTRADAS',
    name: 'Onion Crispy',
    description: '10 unidades de onion rings super crocantes, douradinhas e sequinhas.',
    basePriceCents: 1500,
    icon: 'fries',
    imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'burg-01',
    code: 'BURG-01',
    category: 'HAMBURGUER',
    name: 'Monster Burger Artesanal',
    description: 'Hambúrguer de 180g artesanal, queijo cheddar duplo derretido, bacon crocante, cebola caramelizada e molho especial no pão brioche.',
    basePriceCents: 3200,
    originalPriceCents: 3600,
    discountPercentage: 11,
    isBestSeller: true,
    icon: 'burger',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    isCustomizable: true,
    assemblyGroups: [
      {
        id: 'g-ponto',
        name: 'PONTO DA CARNE',
        minChoices: 1,
        maxChoices: 1,
        isRequired: true,
        options: [
          { id: 'opt-p1', name: 'Ao Ponto da Casa (Rosada)', priceAdjustmentCents: 0 },
          { id: 'opt-p2', name: 'Bem Passado', priceAdjustmentCents: 0 }
        ]
      },
      {
        id: 'g-pao',
        name: 'ESCOLHA O PÃO',
        minChoices: 1,
        maxChoices: 1,
        isRequired: true,
        options: [
          { id: 'opt-b1', name: 'Pão Brioche com Gergelim', priceAdjustmentCents: 0 },
          { id: 'opt-b2', name: 'Pão Australiano', priceAdjustmentCents: 200 }
        ]
      },
      {
        id: 'g-extra',
        name: 'ADICIONAIS EXTRAS',
        minChoices: 0,
        maxChoices: 3,
        isRequired: false,
        options: [
          { id: 'opt-e1', name: 'Bacon Crocante Extra', priceAdjustmentCents: 450 },
          { id: 'opt-e2', name: 'Hambúrguer 180g Adicional', priceAdjustmentCents: 900 }
        ]
      }
    ]
  },
  {
    id: 'burg-02',
    code: 'BURG-02',
    category: 'HAMBURGUER',
    name: 'Smash Cheeseburger Duplo',
    description: '2x Smash burguer de 90g prensados na chapa, queijo derretido e maionese temperada.',
    basePriceCents: 2600,
    icon: 'burger',
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=400&q=80',
    isCustomizable: true
  },
  {
    id: 'beb-01',
    code: 'BEB-01',
    category: 'AGUA 500ML',
    name: 'Água Mineral 500ml',
    description: 'Garrafa 500ml geladinha.',
    basePriceCents: 400,
    icon: 'water',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'beb-02',
    code: 'BEB-02',
    category: 'REFRIGERANTES 350ML',
    name: 'Refrigerante Coca-Cola 350ml',
    description: 'Lata 350ml gelada.',
    basePriceCents: 700,
    icon: 'drink',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'beb-03',
    code: 'BEB-03',
    category: 'REFRIGERANTES 350ML',
    name: 'Guaraná Antarctica 350ml',
    description: 'Lata 350ml gelada.',
    basePriceCents: 700,
    icon: 'drink',
    imageUrl: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'beb-04',
    code: 'BEB-04',
    category: 'REFRIGERANTES 1L',
    name: 'Refrigerante Coca-Cola 1 Litro',
    description: 'Garrafa pet de Coca-Cola 1L gelada.',
    basePriceCents: 1100,
    icon: 'bottle',
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'beb-05',
    code: 'BEB-05',
    category: 'CERVEJAS',
    name: 'Cerveja Heineken 330ml Long Neck',
    description: 'Heineken 330ml estupidamente gelada.',
    basePriceCents: 1000,
    icon: 'beer',
    imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=400&q=80'
  }
];

export interface ServerOrderItem {
  productId: string;
  productName: string;
  basePriceCents: number;
  quantity: number;
  notes?: string;
  selectedAssemblies: Array<{ id: string; name: string; priceAdjustmentCents: number; quantity: number }>;
  selectedModifiers: Array<{ id: string; name: string; priceAdjustmentCents: number; quantity: number }>;
  selectedComplements: Array<{ id: string; name: string; priceAdjustmentCents: number; quantity: number }>;
  itemTotalCents: number;
}

export interface ServerOrder {
  id: string;
  orderNumber: number;
  type: 'SALAO' | 'DELIVERY' | 'RETIRADA';
  status: 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';
  customerName: string;
  customerPhone?: string;
  tableNumber?: number;
  tableId?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
  };
  paymentOption: 'PIX' | 'DINHEIRO_ENTREGA' | 'CARTAO_ENTREGA';
  subtotalCents: number;
  discountCents?: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: ServerOrderItem[];
  createdAt: string;
  updatedAt: string;
}

// Store em memória do servidor para persistência real durante o ciclo de execução
const ordersStoreMap = new Map<string, ServerOrder>();
let dailyOrderCounter = 100;

// Rate Limiter para segurança da API
const ipRequestLogs = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_ORDERS_PER_WINDOW = 5;

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const timestamps = ipRequestLogs.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_ORDERS_PER_WINDOW) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  ipRequestLogs.set(ip, recent);
  return { allowed: true };
}

export function createServerOrder(orderData: Omit<ServerOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): ServerOrder {
  dailyOrderCounter += 1;
  const id = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newOrder: ServerOrder = {
    ...orderData,
    id,
    orderNumber: dailyOrderCounter,
    createdAt: now,
    updatedAt: now
  };

  ordersStoreMap.set(id, newOrder);
  return newOrder;
}

export function getServerOrderById(id: string): ServerOrder | undefined {
  return ordersStoreMap.get(id);
}

export function updateServerOrderStatus(id: string, status: ServerOrder['status']): ServerOrder | null {
  const order = ordersStoreMap.get(id);
  if (!order) return null;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  ordersStoreMap.set(id, order);
  return order;
}

export function sanitizeString(input: string, maxLength: number = 200): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '')
    .replace(/[&<>"'/]/g, (match) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
      };
      return escapeMap[match] || match;
    })
    .trim()
    .slice(0, maxLength);
}
