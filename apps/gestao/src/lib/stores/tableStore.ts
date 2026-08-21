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
  signedQrToken?: string;
  qrCodeUrl?: string;
  items?: Array<{ name: string; qty: number; priceFormatted: string; notes?: string }>;
  orders?: any[];
}

const initialTables: SaloonTable[] = [];

function createTableStore() {
  const { subscribe, set, update } = writable<SaloonTable[]>(initialTables);

  return {
    subscribe,
    set,
    setTables: (tables: SaloonTable[]) => set(tables),
    addTableObject: (t: any) =>
      update(tables => {
        const exists = tables.some(item => item.id === t.id || item.number === t.number);
        if (exists) {
          return tables.map(item => (item.id === t.id || item.number === t.number ? { ...item, ...t } : item));
        }
        return [
          ...tables,
          {
            id: t.id,
            number: t.number,
            capacity: t.capacity || 4,
            status: t.status || 'LIVRE',
            activeOrderTotalFormatted: t.activeOrderTotalFormatted || 'R$ 0,00',
            activeOrderTotalCents: t.activeOrderTotalCents || 0,
            activeOrdersCount: t.activeOrdersCount || 0,
            signedQrToken: t.signedQrToken || '',
            qrCodeUrl: t.qrCodeUrl || '',
            items: t.items || []
          }
        ].sort((a, b) => a.number - b.number);
      }),
    updateStatus: async (tableId: string, status: TableStatusType) => {
      update(tables =>
        tables.map(t =>
          t.id === tableId
            ? { ...t, status, occupiedSince: status === 'LIVRE' ? undefined : (t.occupiedSince || new Date()) }
            : t
        )
      );
      try {
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tableId, status })
        });
      } catch {}
    },
    openTable: async (tableId: string) => {
      update(tables =>
        tables.map(t =>
          t.id === tableId
            ? { ...t, status: 'OCUPADA', occupiedSince: new Date() }
            : t
        )
      );
      try {
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tableId, status: 'OCUPADA' })
        });
      } catch {}
    },
    closeTable: async (tableId: string) => {
      update(tables =>
        tables.map(t =>
          t.id === tableId
            ? {
                ...t,
                status: 'LIVRE',
                activeOrderTotalFormatted: 'R$ 0,00',
                activeOrderTotalCents: 0,
                occupiedSince: undefined,
                activeOrdersCount: 0,
                items: []
              }
            : t
        )
      );
      try {
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tableId, status: 'LIVRE' })
        });
      } catch {}
    }
  };
}

export const tableStore = createTableStore();
