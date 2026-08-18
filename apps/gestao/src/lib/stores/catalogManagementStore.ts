import { writable } from 'svelte/store';

export interface ProductAssemblyOption {
  id: string;
  name: string;
  priceAdjustmentCents: number;
}

export interface ProductAssemblyGroup {
  id: string;
  name: string;
  minChoices: number;
  maxChoices: number;
  isRequired: boolean;
  options: ProductAssemblyOption[];
}

export interface ManagedProduct {
  id: string;
  code: string;
  category: string;
  name: string;
  description: string;
  basePriceCents: number;
  isCustomizable: boolean;
  isActive: boolean;
  imageUrl?: string;
  assemblyGroups?: ProductAssemblyGroup[];
}

export interface ManagedCategory {
  id: string;
  name: string;
  itemCount: number;
  isActive: boolean;
}

export interface ManagedCoupon {
  id: string;
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE' | 'FREE_DELIVERY';
  discountValue: number; // ex: 1000 (R$ 10,00) ou 15 (15%)
  discountLabel: string;
  description: string;
  minOrderCents: number;
  expiryText: string;
  isActive: boolean;
  bannerImageUrl?: string;
}

export interface OperatingHour {
  day: string;
  time: string;
  isOpen: boolean;
}

export interface StoreConfig {
  name: string;
  subtitle: string;
  razaoSocial: string;
  cnpj: string;
  phone: string;
  address: string;
  deliveryFeeCents: number;
  minOrderCents: number;
  slaMinutesMin: number;
  slaMinutesMax: number;
  status: 'ABERTO' | 'FECHADO' | 'PAUSADO';
  paymentMethods: {
    dinheiro: boolean;
    pix: boolean;
    cartaoCredito: boolean;
    cartaoDebito: boolean;
  };
}

const initialStoreConfig: StoreConfig = {
  name: 'Imperius do Pastel',
  subtitle: 'Pastelaria Artesanal & Caldos de Cana · Garanhuns/PE',
  razaoSocial: 'Imperius do Pastel Alimentos Ltda.',
  cnpj: '52.894.103/0001-88',
  phone: '(87) 99812-3456',
  address: 'Av. Rui Barbosa, 450 — Centro, Garanhuns/PE',
  deliveryFeeCents: 600,
  minOrderCents: 1500,
  slaMinutesMin: 20,
  slaMinutesMax: 40,
  status: 'ABERTO',
  paymentMethods: {
    dinheiro: true,
    pix: true,
    cartaoCredito: true,
    cartaoDebito: true
  }
};

const initialCategories: ManagedCategory[] = [
  { id: 'cat-1', name: 'MONTE SEU PASTEL', itemCount: 1, isActive: true },
  { id: 'cat-2', name: 'TRADICIONAIS', itemCount: 3, isActive: true },
  { id: 'cat-3', name: 'NOBRES & GOURMET', itemCount: 2, isActive: true },
  { id: 'cat-4', name: 'DOCES ESPECIAIS', itemCount: 2, isActive: true },
  { id: 'cat-5', name: 'BEBIDAS & CALDOS', itemCount: 6, isActive: true }
];

const initialProducts: ManagedProduct[] = [
  {
    id: 'p1',
    code: 'PAST-01',
    category: 'MONTE',
    name: 'Monte seu Pastel (20cm)',
    description: 'Escolha a massa crocante, 1 recheio principal e até 3 queijos especiais.',
    basePriceCents: 2200,
    isCustomizable: true,
    isActive: true,
    assemblyGroups: [
      {
        id: 'g1',
        name: '1. Escolha a Massa',
        minChoices: 1,
        maxChoices: 1,
        isRequired: true,
        options: [
          { id: 'opt-m1', name: 'Massa Tradicional Crocante', priceAdjustmentCents: 0 },
          { id: 'opt-m2', name: 'Massa de Ervas Finas', priceAdjustmentCents: 200 },
          { id: 'opt-m3', name: 'Massa com Pimenta Suave', priceAdjustmentCents: 200 }
        ]
      },
      {
        id: 'g2',
        name: '2. Recheio Principal',
        minChoices: 1,
        maxChoices: 1,
        isRequired: true,
        options: [
          { id: 'opt-r1', name: 'Carne Moída Prime (120g)', priceAdjustmentCents: 0 },
          { id: 'opt-r2', name: 'Frango Desfiado Temperado', priceAdjustmentCents: 0 },
          { id: 'opt-r3', name: 'Camarão ao Molho Especial', priceAdjustmentCents: 850 }
        ]
      },
      {
        id: 'g3',
        name: '3. Adicione Queijos (Até 3)',
        minChoices: 0,
        maxChoices: 3,
        isRequired: false,
        options: [
          { id: 'opt-q1', name: 'Queijo Catupiry Original', priceAdjustmentCents: 350 },
          { id: 'opt-q2', name: 'Queijo Mussarela Fatiada', priceAdjustmentCents: 300 },
          { id: 'opt-q3', name: 'Queijo Cheddar Cremoso', priceAdjustmentCents: 350 }
        ]
      }
    ]
  },
  {
    id: 'p2',
    code: 'PAST-02',
    category: 'TRADICIONAIS',
    name: 'Pastel de Carne com Queijo',
    description: 'Recheio generoso de carne moída temperada com mussarela derretida.',
    basePriceCents: 1850,
    isCustomizable: false,
    isActive: true
  },
  {
    id: 'p3',
    code: 'PAST-03',
    category: 'TRADICIONAIS',
    name: 'Pastel de Frango com Catupiry',
    description: 'Frango desfiado com o autêntico Catupiry original.',
    basePriceCents: 1750,
    isCustomizable: false,
    isActive: true
  },
  {
    id: 'p4',
    code: 'BEB-01',
    category: 'BEBIDAS',
    name: 'Caldo de Cana Natural 500ml',
    description: 'Moído na hora. Opção com limão fresco.',
    basePriceCents: 1200,
    isCustomizable: false,
    isActive: true
  },
  {
    id: 'p5',
    code: 'DOCE-01',
    category: 'DOCES',
    name: 'Pastel de Romeu e Julieta',
    description: 'Queijo minas meia cura com goiabada cascão cremosa.',
    basePriceCents: 1600,
    isCustomizable: false,
    isActive: true
  }
];

const initialCoupons: ManagedCoupon[] = [
  {
    id: 'c-1',
    code: 'ESPANKA10',
    discountType: 'FIXED',
    discountValue: 1000,
    discountLabel: 'R$ 10,00 OFF',
    description: 'Válido para pedidos acima de R$ 40,00 no seu primeiro pedido.',
    minOrderCents: 4000,
    expiryText: 'Validade: 31/12/2026',
    isActive: true
  },
  {
    id: 'c-2',
    code: 'FRETEGRATIS',
    discountType: 'FREE_DELIVERY',
    discountValue: 0,
    discountLabel: 'ENTREGA GRÁTIS',
    description: 'Válido em pedidos acima de R$ 50,00 para entrega em domicílio.',
    minOrderCents: 5000,
    expiryText: 'Validade: Hoje',
    isActive: true
  },
  {
    id: 'c-3',
    code: 'COMBO20',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    discountLabel: '20% OFF EM COMBOS',
    description: 'Válido para qualquer Combo Especial Espanka Burguer.',
    minOrderCents: 3000,
    expiryText: 'Validade: Esta semana',
    isActive: true
  }
];

const initialHours: OperatingHour[] = [
  { day: 'DOM', time: '17:00 às 23:59', isOpen: true },
  { day: 'SEG', time: '17:00 às 23:59', isOpen: true },
  { day: 'TER', time: '17:00 às 23:59', isOpen: true },
  { day: 'QUA', time: '17:00 às 23:59', isOpen: true },
  { day: 'QUI', time: '17:00 às 23:59', isOpen: true },
  { day: 'SEX', time: '17:00 às 00:30', isOpen: true },
  { day: 'SÁB', time: '17:00 às 00:30', isOpen: true }
];

function createCatalogStore() {
  const storeConfig = writable<StoreConfig>(initialStoreConfig);
  const categories = writable<ManagedCategory[]>(initialCategories);
  const products = writable<ManagedProduct[]>(initialProducts);
  const coupons = writable<ManagedCoupon[]>(initialCoupons);
  const operatingHours = writable<OperatingHour[]>(initialHours);

  return {
    storeConfig,
    categories,
    products,
    coupons,
    operatingHours,

    // Métodos para alteração de loja e taxas
    updateStoreConfig(newConfig: Partial<StoreConfig>) {
      storeConfig.update(c => ({ ...c, ...newConfig }));
    },

    toggleStoreStatus(status: 'ABERTO' | 'FECHADO' | 'PAUSADO') {
      storeConfig.update(c => ({ ...c, status }));
    },

    // Métodos para gestão de produtos
    toggleProductActive(id: string) {
      products.update(list =>
        list.map(p => (p.id === id ? { ...p, isActive: !p.isActive } : p))
      );
    },

    saveProduct(product: ManagedProduct) {
      products.update(list => {
        const index = list.findIndex(p => p.id === product.id);
        if (index >= 0) {
          list[index] = product;
          return [...list];
        }
        return [...list, product];
      });
    },

    deleteProduct(id: string) {
      products.update(list => list.filter(p => p.id !== id));
    },

    // Métodos para gestão de categorias
    addCategory(name: string) {
      categories.update(list => [
        ...list,
        { id: `cat-${Date.now()}`, name: name.toUpperCase(), itemCount: 0, isActive: true }
      ]);
    },

    toggleCategoryActive(id: string) {
      categories.update(list =>
        list.map(c => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
    },

    // Métodos para gestão de cupons
    toggleCouponActive(id: string) {
      coupons.update(list =>
        list.map(c => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
    },

    saveCoupon(coupon: ManagedCoupon) {
      coupons.update(list => {
        const index = list.findIndex(c => c.id === coupon.id);
        if (index >= 0) {
          list[index] = coupon;
          return [...list];
        }
        return [...list, coupon];
      });
    },

    deleteCoupon(id: string) {
      coupons.update(list => list.filter(c => c.id !== id));
    },

    // Métodos para horários
    toggleDayOpen(day: string) {
      operatingHours.update(list =>
        list.map(h => (h.day === day ? { ...h, isOpen: !h.isOpen } : h))
      );
    },

    updateDayTime(day: string, time: string) {
      operatingHours.update(list =>
        list.map(h => (h.day === day ? { ...h, time } : h))
      );
    }
  };
}

export const catalogManager = createCatalogStore();
