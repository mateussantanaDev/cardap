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

const initialTenants: Tenant[] = [
  {
    id: 't-imperius-pastel',
    slug: 'imperius-do-pastel',
    name: 'Imperius do Pastel',
    category: 'Pastelaria Artesanal & Caldos de Cana',
    cnpj: '52.894.103/0001-88',
    ownerName: 'Mateus Vieira',
    ownerPhone: '(87) 99812-3456',
    plan: 'ENTERPRISE',
    planPriceCents: 29900,
    status: 'ATIVO',
    vitrineUrl: 'http://localhost:3001/imperius-do-pastel',
    createdAt: '17/08/2026',
    totalOrdersMonth: 580,
    gmvMonthCents: 2380000
  }
];

function createTenantStore() {
  const tenants = writable<Tenant[]>(initialTenants);
  const activeTenantId = writable<string>('t-imperius-pastel');

  const activeTenant = derived([tenants, activeTenantId], ([$tenants, $activeTenantId]) => {
    return $tenants.find(t => t.id === $activeTenantId) || $tenants[0];
  });

  return {
    tenants,
    activeTenantId,
    activeTenant,

    selectTenant: (id: string) => {
      activeTenantId.set(id);
    },

    addTenant: (t: Tenant) => {
      tenants.update(list => [...list, t]);
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
