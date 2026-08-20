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

const initialTables: SaloonTable[] = [];

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
