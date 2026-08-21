import { writable } from 'svelte/store';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'GERENTE' | 'CAIXA' | 'GARCOM' | 'ATENDENTE' | 'COZINHA' | 'MOTOBOY';
  roleLabel: string;
  status: 'ATIVO' | 'SUSPENSO';
  restaurantId?: string | null;
  restaurantName?: string;
  lastAccess: string;
}

export interface DetectedPrinter {
  id: string;
  name: string;
  port: string;
  paperWidth: '80mm' | '58mm';
  type: 'USB' | 'NETWORK' | 'BLUETOOTH';
  isDefaultCashier: boolean;
  isDefaultKitchen: boolean;
  status: 'PRONTA' | 'DISPONIVEL' | 'OFFLINE';
}

export interface GatewayConfig {
  activeGateway: 'MERCADO_PAGO' | 'TON' | 'PAGSEGURO' | 'MANUAL';
  mercadoPago: {
    publicKey: string;
    accessToken: string;
    clientId: string;
    clientSecret: string;
    pixAutoEnabled: boolean;
    pointMachineEnabled: boolean;
    isProduction: boolean;
  };
  ton: {
    apiKey: string;
    merchantId: string;
    tonTapEnabled: boolean;
    t3MachineEnabled: boolean;
  };
}

const initialUsers: SystemUser[] = [];
const initialPrinters: DetectedPrinter[] = [];

const initialGateway: GatewayConfig = {
  activeGateway: 'MANUAL',
  mercadoPago: {
    publicKey: '',
    accessToken: '',
    clientId: '',
    clientSecret: '',
    pixAutoEnabled: false,
    pointMachineEnabled: false,
    isProduction: false
  },
  ton: {
    apiKey: '',
    merchantId: '',
    tonTapEnabled: false,
    t3MachineEnabled: false
  }
};

function createSystemConfigStore() {
  const users = writable<SystemUser[]>(initialUsers);
  const printers = writable<DetectedPrinter[]>(initialPrinters);
  const gateway = writable<GatewayConfig>(initialGateway);

  return {
    users,
    printers,
    gateway,

    setUsers: (list: SystemUser[]) => users.set(list),
    setPrinters: (list: DetectedPrinter[]) => printers.set(list),

    // Métodos Usuários
    addUser: (u: SystemUser) => users.update(list => [...list, u]),
    toggleUserStatus: (id: string) =>
      users.update(list =>
        list.map(u => (u.id === id ? { ...u, status: u.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO' } : u))
      ),
    deleteUser: (id: string) => users.update(list => list.filter(u => u.id !== id)),

    // Métodos Impressoras
    setDefaultCashierPrinter: (id: string) =>
      printers.update(list =>
        list.map(p => ({ ...p, isDefaultCashier: p.id === id }))
      ),
    setDefaultKitchenPrinter: (id: string) =>
      printers.update(list =>
        list.map(p => ({ ...p, isDefaultKitchen: p.id === id }))
      ),
    scanPrinters: () => {
      // Simula re-escaneamento de hardware e portas
      printers.set(initialPrinters);
    },

    // Métodos Gateway
    setActiveGateway: (activeGateway: 'MERCADO_PAGO' | 'TON' | 'PAGSEGURO' | 'MANUAL') =>
      gateway.update(g => ({ ...g, activeGateway })),
    updateMercadoPago: (data: Partial<GatewayConfig['mercadoPago']>) =>
      gateway.update(g => ({ ...g, mercadoPago: { ...g.mercadoPago, ...data } })),
    updateTon: (data: Partial<GatewayConfig['ton']>) =>
      gateway.update(g => ({ ...g, ton: { ...g.ton, ...data } }))
  };
}

export const systemConfigManager = createSystemConfigStore();
