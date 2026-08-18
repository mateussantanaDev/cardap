import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface SelectedOptionChoice {
  id: string;
  name: string;
  priceAdjustmentCents: number;
  quantity: number;
}

export interface VitrineCartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  basePriceCents: number;
  quantity: number;
  notes?: string;
  selectedAssemblies: SelectedOptionChoice[];
  selectedModifiers: SelectedOptionChoice[];
  selectedComplements: SelectedOptionChoice[];
  itemTotalCents: number;
}

function calculateItemTotal(item: Omit<VitrineCartItem, 'cartItemId' | 'itemTotalCents'>): number {
  let unitPrice = item.basePriceCents;

  for (const asm of item.selectedAssemblies) {
    unitPrice += asm.priceAdjustmentCents * (asm.quantity || 1);
  }
  for (const mod of item.selectedModifiers) {
    unitPrice += mod.priceAdjustmentCents * (mod.quantity || 1);
  }
  for (const cmp of item.selectedComplements) {
    unitPrice += cmp.priceAdjustmentCents * (cmp.quantity || 1);
  }

  return unitPrice * item.quantity;
}

const STORAGE_KEY = 'cardap_vitrine_cart_v1';

function getInitialCart(): VitrineCartItem[] {
  if (!browser) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao restaurar carrinho do localStorage:', e);
  }
  return [];
}

function createCartStore() {
  const { subscribe, set, update } = writable<VitrineCartItem[]>(getInitialCart());

  // Auto-salvar no localStorage quando estado mudar no browser
  if (browser) {
    subscribe(items => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Erro ao salvar carrinho no localStorage:', e);
      }
    });
  }

  return {
    subscribe,
    addItem: (rawItem: Omit<VitrineCartItem, 'cartItemId' | 'itemTotalCents'>) => {
      const sanitizedQuantity = Math.max(1, Math.min(99, Math.floor(rawItem.quantity || 1)));
      const itemToCalc = { ...rawItem, quantity: sanitizedQuantity };
      const itemTotalCents = calculateItemTotal(itemToCalc);
      const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      update(items => [...items, { ...itemToCalc, cartItemId, itemTotalCents }]);
    },
    updateQuantity: (cartItemId: string, delta: number) => {
      update(items =>
        items
          .map(item => {
            if (item.cartItemId === cartItemId) {
              const newQty = item.quantity + delta;
              if (newQty <= 0) return null;
              const sanitizedQty = Math.min(99, newQty);
              const updatedItem = { ...item, quantity: sanitizedQty };
              return { ...updatedItem, itemTotalCents: calculateItemTotal(updatedItem) };
            }
            return item;
          })
          .filter(Boolean) as VitrineCartItem[]
      );
    },
    updateItemNotes: (cartItemId: string, notes: string) => {
      update(items =>
        items.map(item => (item.cartItemId === cartItemId ? { ...item, notes } : item))
      );
    },
    removeItem: (cartItemId: string) => {
      update(items => items.filter(i => i.cartItemId !== cartItemId));
    },
    clearCart: () => {
      set([]);
      if (browser) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      }
    }
  };
}

export const cartStore = createCartStore();

// Derived Stores para cálculos reativos no carrinho
export const cartSubtotalCents = derived(cartStore, $items =>
  $items.reduce((acc, item) => acc + item.itemTotalCents, 0)
);

export const cartItemCount = derived(cartStore, $items =>
  $items.reduce((acc, item) => acc + item.quantity, 0)
);

export const cartSubtotalFormatted = derived(cartSubtotalCents, $cents =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format($cents / 100)
);
