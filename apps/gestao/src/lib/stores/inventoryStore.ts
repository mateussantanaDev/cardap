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

const initialInventory: InventoryItem[] = [
  {
    id: 'inv-1',
    code: 'INS-001',
    name: 'Massa Crocante Especial (Pastel 25cm)',
    category: 'INSUMO',
    currentQuantity: 80.0,
    unit: 'KG',
    minQuantity: 10.0,
    unitCostCents: 750,
    supplier: 'Distribuidora Farinhas do Agreste',
    lastRestockDate: '17/08/2026',
    status: 'NORMAL'
  },
  {
    id: 'inv-2',
    code: 'INS-002',
    name: 'Carne Moída Bovina Prime',
    category: 'INSUMO',
    currentQuantity: 45.0,
    unit: 'KG',
    minQuantity: 5.0,
    unitCostCents: 2600,
    supplier: 'Frigorífico Bom Pastor',
    lastRestockDate: '16/08/2026',
    status: 'NORMAL'
  },
  {
    id: 'inv-3',
    code: 'INS-003',
    name: 'Peito de Frango Desfiado Temperado',
    category: 'INSUMO',
    currentQuantity: 35.0,
    unit: 'KG',
    minQuantity: 5.0,
    unitCostCents: 1800,
    supplier: 'Avícola São José',
    lastRestockDate: '17/08/2026',
    status: 'NORMAL'
  },
  {
    id: 'inv-4',
    code: 'INS-004',
    name: 'Queijo Mussarela Fatiada Especial',
    category: 'INSUMO',
    currentQuantity: 40.0,
    unit: 'KG',
    minQuantity: 6.0,
    unitCostCents: 3200,
    supplier: 'Laticínios Vale do Ipanema',
    lastRestockDate: '15/08/2026',
    status: 'NORMAL'
  },
  {
    id: 'inv-5',
    code: 'INS-005',
    name: 'Catupiry Original Requeijão Cremoso',
    category: 'INSUMO',
    currentQuantity: 25.0,
    unit: 'KG',
    minQuantity: 4.0,
    unitCostCents: 3800,
    supplier: 'Distribuidora Catupiry Brasil',
    lastRestockDate: '14/08/2026',
    status: 'NORMAL'
  },
  {
    id: 'inv-6',
    code: 'INS-006',
    name: 'Queijo Coalho Tradicional do Agreste',
    category: 'INSUMO',
    currentQuantity: 20.0,
    unit: 'KG',
    minQuantity: 3.0,
    unitCostCents: 3400,
    supplier: 'Queijaria Artesanal Garanhuns',
    lastRestockDate: '16/08/2026',
    status: 'NORMAL'
  },
  {
    id: 'inv-7',
    code: 'INS-012',
    name: 'Cana-de-Açúcar em Colmos Selecionados',
    category: 'INSUMO',
    currentQuantity: 120.0,
    unit: 'KG',
    minQuantity: 20.0,
    unitCostCents: 250,
    supplier: 'Engenho Boa Vista',
    lastRestockDate: '17/08/2026',
    status: 'NORMAL'
  },
  {
    id: 'inv-8',
    code: 'INS-014',
    name: 'Embalagem Térmica Imperius Delivery',
    category: 'EMBALAGEM',
    currentQuantity: 500,
    unit: 'UN',
    minQuantity: 50,
    unitCostCents: 85,
    supplier: 'Gráfica & Embalagens Express',
    lastRestockDate: '10/08/2026',
    status: 'NORMAL'
  }
];

function createInventoryStore() {
  const { subscribe, set, update } = writable<InventoryItem[]>(initialInventory);

  return {
    subscribe,
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
