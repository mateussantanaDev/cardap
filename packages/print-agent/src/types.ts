export type PrintSector = 'CAIXA' | 'COZINHA' | 'BAR' | 'DELIVERY' | 'TODOS';

export interface WindowsPrinter {
  name: string;
  portName?: string;
  driverName?: string;
  isDefault: boolean;
  status: string;
}

export interface PrintStation {
  id: string;
  name: string; // Ex: "Cozinha", "Caixa Principal", "Bar / Bebidas"
  serverUrl: string; // Ex: "https://app.usecardap.com.br"
  token: string; // Token de autenticação gerado no ERP
  targetPrinter: string; // Nome da impressora física no Windows/Mac ou IP (ex: 192.168.1.200:9100)
  sector: PrintSector;
  enabled: boolean;
  status?: 'CONECTADO' | 'RECONECTANDO' | 'ERRO' | 'DESCONECTADO';
  restaurantName?: string;
  lastPingAt?: string;
  lastPrintAt?: string;
  lastError?: string;
}

export interface PrintJob {
  id?: string;
  orderNumber?: number;
  sector?: PrintSector;
  printerName?: string;
  content: string;
  rawEscpos?: string;
  cut?: boolean;
  openDrawer?: boolean;
  beep?: boolean;
  copies?: number;
}

export interface AgentConfig {
  port: number;
  stations: PrintStation[];
  autoCut: boolean;
  cashDrawerOnCashSale: boolean;
  beepOnKitchenOrder: boolean;
}

export interface PrintResult {
  success: boolean;
  jobId?: string;
  printerUsed: string;
  sector?: PrintSector;
  error?: string;
  timestamp: string;
}
