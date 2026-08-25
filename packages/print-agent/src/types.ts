export type PrintSector = 'CAIXA' | 'COZINHA' | 'BAR' | 'DELIVERY' | 'TODOS';

export interface WindowsPrinter {
  name: string;
  portName?: string;
  driverName?: string;
  isDefault: boolean;
  status: string;
}

export interface PrintJob {
  id?: string;
  orderNumber?: number;
  sector?: PrintSector;
  printerName?: string;
  content: string;
  rawEscpos?: string; // Base64 encoded ESC/POS buffer if pre-compiled
  cut?: boolean;
  openDrawer?: boolean;
  beep?: boolean;
  copies?: number;
}

export interface AgentConfig {
  port: number;
  secretKey: string;
  serverUrl: string;
  token: string;
  restaurantId: string;
  restaurantName?: string;
  deviceName: string;
  allowedSectors: PrintSector[];
  printers: {
    CAIXA?: string;
    COZINHA?: string;
    BAR?: string;
    DELIVERY?: string;
    DEFAULT?: string;
  };
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
