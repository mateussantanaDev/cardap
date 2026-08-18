import { writable } from 'svelte/store';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalOrdersCount: number;
  totalSpentCents: number;
  totalSpentFormatted: string;
  lastOrderDate: string;
  tags: string[];
}

const initialCustomers: Customer[] = [
  {
    id: 'cli-1',
    name: 'Mateus Vieira',
    phone: '(87) 99812-3456',
    address: 'Rua das Flores, 120 — Heliópolis, Garanhuns/PE',
    totalOrdersCount: 18,
    totalSpentCents: 114000,
    totalSpentFormatted: 'R$ 1.140,00',
    lastOrderDate: '17/08/2026',
    tags: ['VIP', 'RECORRENTE']
  },
  {
    id: 'cli-2',
    name: 'Mariana Albuquerque',
    phone: '(87) 99988-7766',
    address: 'Av. Simoa Gomes, 88 — Severiano Moraes, Garanhuns/PE',
    totalOrdersCount: 6,
    totalSpentCents: 36500,
    totalSpentFormatted: 'R$ 365,00',
    lastOrderDate: '16/08/2026',
    tags: ['NOVO', 'DELIVERY']
  }
];

function createCustomerStore() {
  const { subscribe, set, update } = writable<Customer[]>(initialCustomers);

  return {
    subscribe,
    setCustomers: (customers: Customer[]) => set(customers),
    addCustomer: (cust: Customer) => update(list => [...list, cust]),
    deleteCustomer: (id: string) => update(list => list.filter(c => c.id !== id))
  };
}

export const customerStore = createCustomerStore();
