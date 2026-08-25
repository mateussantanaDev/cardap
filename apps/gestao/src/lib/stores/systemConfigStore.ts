import { writable, get } from 'svelte/store';
import { PrinterService } from '$services/printerService';

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

export interface PrinterDeviceRecord {
  id: string;
  name: string;
  token: string;
  allowedSectors: string[];
  status: 'ONLINE' | 'OFFLINE';
  ipAddress?: string;
  lastPingAt?: string;
  createdAt: string;
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
  const agentStatus = writable<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const agentDetails = writable<any>(null);
  const devices = writable<PrinterDeviceRecord[]>([]);

  // Inicializa verificação de saúde do agente local
  async function checkAgent() {
    agentStatus.set('CHECKING');
    const res = await PrinterService.checkAgentStatus();
    if (res && res.status === 'ONLINE') {
      agentStatus.set('ONLINE');
      agentDetails.set(res);
    } else {
      agentStatus.set('OFFLINE');
      agentDetails.set(null);
    }
  }

  // Varrer impressoras reais instaladas no Windows através do Agente
  async function scanPrinters(): Promise<DetectedPrinter[]> {
    const isOnline = get(agentStatus) === 'ONLINE';
    if (!isOnline) {
      await checkAgent();
    }

    const winPrinters = await PrinterService.listWindowsPrinters();
    const mapped: DetectedPrinter[] = winPrinters.map((wp, index) => ({
      id: `sys-prt-${index}-${wp.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: wp.name,
      port: wp.portName || (wp.name.includes('192.') ? 'Rede 9100' : 'USB / Driver RAW'),
      paperWidth: wp.name.includes('58') ? '58mm' : '80mm',
      type: wp.name.includes('192.') ? 'NETWORK' : 'USB',
      isDefaultCashier: wp.isDefault || index === 0,
      isDefaultKitchen: !wp.isDefault && index === 1,
      status: (wp.status?.toUpperCase() === 'PRONTA' ? 'PRONTA' : 'DISPONIVEL') as any
    }));
    printers.set(mapped);
    return mapped;
  }

  // Carrega terminais pareados da nuvem
  async function loadDevices(restaurantId?: string) {
    try {
      const url = restaurantId ? `/api/settings/printers?restaurantId=${encodeURIComponent(restaurantId)}` : '/api/settings/printers';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          devices.set(data.devices || []);
        }
      }
    } catch {}
  }

  // Cria um novo token de pareamento
  async function createDevice(name: string, allowedSectors = ['TODOS'], restaurantId?: string) {
    try {
      const res = await fetch('/api/settings/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, allowedSectors, restaurantId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          await loadDevices(restaurantId);
          return data.device;
        } else {
          alert('Erro ao gerar token: ' + (data.error || 'Falha no servidor.'));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Erro ao gerar token: ' + (err.error || `HTTP ${res.status}`));
      }
    } catch (e: any) {
      alert('Erro de conexão ao gerar token: ' + e.message);
    }
    return null;
  }

  // Remove um terminal pareado
  async function deleteDevice(id: string) {
    try {
      const res = await fetch(`/api/settings/printers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadDevices();
        return true;
      }
    } catch {}
    return false;
  }

  return {
    users,
    printers,
    gateway,
    agentStatus,
    agentDetails,
    devices,

    checkAgent,
    scanPrinters,
    loadDevices,
    createDevice,
    deleteDevice,

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
