import { writable } from 'svelte/store';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string; // INSUMO | EMBALAGEM | BEBIDA_REVEC
  currentQuantity: number;
  unit: 'KG' | 'L' | 'UN' | 'CX';
  minQuantity: number;
  unitCostCents: number;
  supplier: string;
  lastRestockDate: string;
  status: 'NORMAL' | 'BAIXO' | 'CRITICO';
}

const initialInventory: InventoryItem[] = [];

function createInventoryStore() {
  const { subscribe, set, update } = writable<InventoryItem[]>(initialInventory);

  return {
    subscribe,
    setInventory: (items: InventoryItem[]) => set(items),
    addItem: (item: InventoryItem) => update(list => [...list, item]),
    updateQuantity: (id: string, newQty: number) =>
      update(list =>
        list.map(i => {
          if (i.id === id) {
            const status = newQty <= i.minQuantity * 0.5 ? 'CRITICO' : newQty <= i.minQuantity ? 'BAIXO' : 'NORMAL';
            return { ...i, currentQuantity: newQty, status };
          }
          return i;
        })
      ),
    deleteItem: (id: string) => update(list => list.filter(i => i.id !== id))
  };
}

export const inventoryStore = createInventoryStore();
