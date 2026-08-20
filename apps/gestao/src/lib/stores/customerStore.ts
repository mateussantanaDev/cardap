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

const initialCustomers: Customer[] = [];

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
