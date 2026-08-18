import { writable } from 'svelte/store';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CAIXA' | 'ATENDENTE' | 'COZINHA';
  roleLabel: string;
  status: 'ATIVO' | 'SUSPENSO';
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

const initialUsers: SystemUser[] = [
  { id: 'usr-admin', name: 'Mateus Vieira (Administrador)', email: 'admin@imperiusdopastel.com.br', role: 'ADMIN', roleLabel: 'Administrador / Gerente', status: 'ATIVO', lastAccess: 'Agora' },
  { id: 'usr-caixa', name: 'Carlos Operador de Caixa', email: 'caixa@imperiusdopastel.com.br', role: 'CAIXA', roleLabel: 'Operador de Caixa', status: 'ATIVO', lastAccess: 'Hoje às 08:00' },
  { id: 'usr-cozinha', name: 'Chef Lucas (Cozinha KDS)', email: 'cozinha@imperiusdopastel.com.br', role: 'COZINHA', roleLabel: 'Chef de Cozinha / KDS', status: 'ATIVO', lastAccess: 'Hoje às 08:30' }
];

const initialPrinters: DetectedPrinter[] = [
  { id: 'prt-1', name: 'EPSON TM-T20X (Térmica)', port: 'USB001', paperWidth: '80mm', type: 'USB', isDefaultCashier: true, isDefaultKitchen: false, status: 'PRONTA' },
  { id: 'prt-2', name: 'BEMATECH MP-4200 TH (Cozinha)', port: '192.168.1.200:9100', paperWidth: '80mm', type: 'NETWORK', isDefaultCashier: false, isDefaultKitchen: true, status: 'PRONTA' },
  { id: 'prt-3', name: 'DARUMA DR800 (Auxiliar)', port: 'USB002', paperWidth: '58mm', type: 'USB', isDefaultCashier: false, isDefaultKitchen: false, status: 'DISPONIVEL' }
];

const initialGateway: GatewayConfig = {
  activeGateway: 'MERCADO_PAGO',
  mercadoPago: {
    publicKey: 'APP_USR-65239102-9923-481a-a102-984210982341',
    accessToken: 'APP_USR-88210349-1120-4491-b921-110293849102',
    clientId: '6523910299234810',
    clientSecret: 'Secret_MP_Live_2026',
    pixAutoEnabled: true,
    pointMachineEnabled: true,
    isProduction: true
  },
  ton: {
    apiKey: 'ton_live_key_9934102983410298',
    merchantId: 'MERCHANT_TON_88102',
    tonTapEnabled: true,
    t3MachineEnabled: true
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
