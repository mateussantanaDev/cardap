import { writable } from 'svelte/store';

export type TableStatusType = 'LIVRE' | 'OCUPADA' | 'CONTA_SOLICITADA' | 'RESERVADA';

export interface SaloonTable {
  id: string;
  number: number;
  capacity: number;
  status: TableStatusType;
  activeOrderTotalFormatted: string;
  activeOrderTotalCents: number;
  occupiedSince?: Date;
  activeOrdersCount: number;
}

const initialTables: SaloonTable[] = [
  { id: 'tbl-1', number: 1, capacity: 2, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-2', number: 2, capacity: 4, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-3', number: 3, capacity: 4, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-4', number: 4, capacity: 4, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-5', number: 5, capacity: 6, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-6', number: 6, capacity: 6, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-7', number: 7, capacity: 2, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-8', number: 8, capacity: 4, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-9', number: 9, capacity: 8, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 },
  { id: 'tbl-10', number: 10, capacity: 4, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, activeOrdersCount: 0 }
];

function createTableStore() {
  const { subscribe, set, update } = writable<SaloonTable[]>(initialTables);

  return {
    subscribe,
    setTables: (tables: SaloonTable[]) => set(tables),
    addTable: (number: number, capacity: number) =>
      update(tables => [
        ...tables,
        {
          id: `tbl-${Date.now()}`,
          number,
          capacity,
          status: 'LIVRE',
          activeOrderTotalFormatted: 'R$ 0,00',
          activeOrderTotalCents: 0,
          activeOrdersCount: 0
        }
      ]),
    updateStatus: (tableId: string, status: TableStatusType) =>
      update(tables =>
        tables.map(t =>
          t.id === tableId ? { ...t, status, occupiedSince: status === 'LIVRE' ? undefined : (t.occupiedSince || new Date()) } : t
        )
      ),
    openTable: (tableId: string) =>
      update(tables =>
        tables.map(t =>
          t.id === tableId
            ? { ...t, status: 'OCUPADA', occupiedSince: new Date(), activeOrdersCount: 1 }
            : t
        )
      ),
    closeTable: (tableId: string) =>
      update(tables =>
        tables.map(t =>
          t.id === tableId
            ? { ...t, status: 'LIVRE', activeOrderTotalFormatted: 'R$ 0,00', activeOrderTotalCents: 0, occupiedSince: undefined, activeOrdersCount: 0 }
            : t
        )
      )
  };
}

export const tableStore = createTableStore();
