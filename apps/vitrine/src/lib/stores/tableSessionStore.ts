import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface TableSessionData {
  isTableMode: boolean;
  tableNumber: number | null;
  tableId: string | null;
  token: string | null;
  restaurantSlug: string | null;
  comandaItems: Array<{ name: string; qty: number; priceFormatted: string; notes?: string }>;
  comandaTotalCents: number;
}

const STORAGE_KEY = 'cardap_table_session_v2';

function getInitialSession(): TableSessionData {
  if (!browser) {
    return {
      isTableMode: false,
      tableNumber: null,
      tableId: null,
      token: null,
      restaurantSlug: null,
      comandaItems: [],
      comandaTotalCents: 0
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.tableNumber && parsed.token) {
        return {
          isTableMode: true,
          tableNumber: Number(parsed.tableNumber),
          tableId: parsed.tableId || null,
          token: parsed.token,
          restaurantSlug: parsed.restaurantSlug || null,
          comandaItems: Array.isArray(parsed.comandaItems) ? parsed.comandaItems : [],
          comandaTotalCents: Number(parsed.comandaTotalCents) || 0
        };
      }
    }
  } catch (e) {
    console.error('Erro ao ler cardap_table_session:', e);
  }

  return {
    isTableMode: false,
    tableNumber: null,
    tableId: null,
    token: null,
    restaurantSlug: null,
    comandaItems: [],
    comandaTotalCents: 0
  };
}

function createTableSessionStore() {
  const { subscribe, set, update } = writable<TableSessionData>(getInitialSession());

  if (browser) {
    subscribe(state => {
      try {
        if (state.isTableMode && state.tableNumber) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {}
    });
  }

  return {
    subscribe,
    setTableSession: (data: { tableNumber: number; tableId?: string; token: string; restaurantSlug?: string }) => {
      update(prev => ({
        ...prev,
        isTableMode: true,
        tableNumber: Number(data.tableNumber),
        tableId: data.tableId || prev.tableId,
        token: data.token,
        restaurantSlug: data.restaurantSlug || prev.restaurantSlug
      }));
    },
    updateComanda: (items: Array<{ name: string; qty: number; priceFormatted: string; notes?: string }>, totalCents: number) => {
      update(prev => ({
        ...prev,
        comandaItems: items,
        comandaTotalCents: totalCents
      }));
    },
    addComandaItem: (item: { name: string; qty: number; priceFormatted: string; notes?: string }, priceCents: number) => {
      update(prev => ({
        ...prev,
        comandaItems: [...prev.comandaItems, item],
        comandaTotalCents: prev.comandaTotalCents + priceCents
      }));
    },
    clearTableSession: () => {
      set({
        isTableMode: false,
        tableNumber: null,
        tableId: null,
        token: null,
        restaurantSlug: null,
        comandaItems: [],
        comandaTotalCents: 0
      });
      if (browser) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
    }
  };
}

export const tableSessionStore = createTableSessionStore();

export const isTableMode = derived(tableSessionStore, $s => $s.isTableMode);
export const tableNumber = derived(tableSessionStore, $s => $s.tableNumber);
export const comandaTotalFormatted = derived(tableSessionStore, $s =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format($s.comandaTotalCents / 100)
);
