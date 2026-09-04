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
  categoryId?: string;
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
  discountValue: number;
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
  name: '',
  subtitle: '',
  razaoSocial: '',
  cnpj: '',
  phone: '',
  address: '',
  deliveryFeeCents: 0,
  minOrderCents: 0,
  slaMinutesMin: 0,
  slaMinutesMax: 0,
  status: 'FECHADO',
  paymentMethods: {
    dinheiro: true,
    pix: true,
    cartaoCredito: true,
    cartaoDebito: true
  }
};

const initialCategories: ManagedCategory[] = [];
const initialProducts: ManagedProduct[] = [];
const initialCoupons: ManagedCoupon[] = [];

const initialHours: OperatingHour[] = [
  { day: 'DOM', time: '17:00 às 23:59', isOpen: false },
  { day: 'SEG', time: '17:00 às 23:59', isOpen: false },
  { day: 'TER', time: '17:00 às 23:59', isOpen: false },
  { day: 'QUA', time: '17:00 às 23:59', isOpen: false },
  { day: 'QUI', time: '17:00 às 23:59', isOpen: false },
  { day: 'SEX', time: '17:00 às 00:30', isOpen: false },
  { day: 'SÁB', time: '17:00 às 00:30', isOpen: false }
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

    setCategories(list: ManagedCategory[]) {
      categories.set(list);
    },

    setProducts(list: ManagedProduct[]) {
      products.set(list);
    },

    setCoupons(list: ManagedCoupon[]) {
      coupons.set(list);
    },

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
