import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AgentConfig } from '../types.js';

const DEFAULT_CONFIG: AgentConfig = {
  port: 9898,
  secretKey: 'cardap_local_agent_secret',
  serverUrl: 'http://localhost:5173',
  token: '',
  restaurantId: '',
  restaurantName: '',
  deviceName: `${os.hostname()} - Terminal 1`,
  allowedSectors: ['TODOS'],
  printers: {
    DEFAULT: '',
    CAIXA: '',
    COZINHA: '',
    BAR: '',
    DELIVERY: ''
  },
  autoCut: true,
  cashDrawerOnCashSale: true,
  beepOnKitchenOrder: true
};

export class ConfigStore {
  private static instance: ConfigStore;
  private configPath: string;
  private currentConfig: AgentConfig;

  private constructor() {
    const baseDir =
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support', 'CardapPrintAgent')
        : path.join(os.homedir(), '.cardap-print-agent'));

    try {
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
    } catch {
      // Fallback para diretório local de execução
    }

    this.configPath = path.join(baseDir, 'config.json');
    this.currentConfig = this.load();
  }

  public static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore();
    }
    return ConfigStore.instance;
  }

  public getConfig(): AgentConfig {
    return { ...this.currentConfig };
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public updateConfig(partial: Partial<AgentConfig>): AgentConfig {
    this.currentConfig = {
      ...this.currentConfig,
      ...partial,
      printers: {
        ...this.currentConfig.printers,
        ...(partial.printers || {})
      }
    };
    this.save();
    return this.getConfig();
  }

  private load(): AgentConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (err) {
      console.warn('[ConfigStore] Erro ao carregar config.json, usando padrão:', err);
    }
    return { ...DEFAULT_CONFIG };
  }

  private save(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.currentConfig, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ConfigStore] Erro ao salvar config.json:', err);
    }
  }
}

export const configStore = ConfigStore.getInstance();
