import { writable, derived } from 'svelte/store';

export type TenantPlan = 'BASIC' | 'PRO_DELIVERY' | 'ENTERPRISE';
export type TenantStatus = 'ATIVO' | 'EM_TESTE' | 'SUSPENSO';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  category: string;
  cnpj: string;
  ownerName: string;
  ownerPhone: string;
  plan: TenantPlan;
  planPriceCents: number;
  status: TenantStatus;
  vitrineUrl: string;
  createdAt: string;
  totalOrdersMonth: number;
  gmvMonthCents: number;
}

const defaultEmptyTenant: Tenant = {
  id: '',
  slug: '',
  name: 'Nenhum Restaurante Ativo',
  category: 'Geral',
  cnpj: '',
  ownerName: '',
  ownerPhone: '',
  plan: 'BASIC',
  planPriceCents: 0,
  status: 'ATIVO',
  vitrineUrl: '',
  createdAt: '',
  totalOrdersMonth: 0,
  gmvMonthCents: 0
};

const initialTenants: Tenant[] = [];

function createTenantStore() {
  const tenants = writable<Tenant[]>(initialTenants);
  const activeTenantId = writable<string>('');

  const activeTenant = derived([tenants, activeTenantId], ([$tenants, $activeTenantId]) => {
    return $tenants.find(t => t.id === $activeTenantId) || $tenants[0] || defaultEmptyTenant;
  });

  return {
    tenants,
    activeTenantId,
    activeTenant,

    selectTenant: (id: string) => {
      activeTenantId.set(id);
    },

    setTenants: (list: Tenant[]) => {
      tenants.set(list);
      if (list.length > 0) {
        activeTenantId.set(list[0].id);
      } else {
        activeTenantId.set('');
      }
    },

    addTenant: (t: Tenant) => {
      tenants.update(list => [...list, t]);
      activeTenantId.set(t.id);
    },

    toggleStatus: (id: string) => {
      tenants.update(list =>
        list.map(t => {
          if (t.id === id) {
            const nextStatus: TenantStatus = t.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
            return { ...t, status: nextStatus };
          }
          return t;
        })
      );
    },

    updatePlan: (id: string, plan: TenantPlan, planPriceCents: number) => {
      tenants.update(list =>
        list.map(t => (t.id === id ? { ...t, plan, planPriceCents } : t))
      );
    }
  };
}

export const tenantManager = createTenantStore();
