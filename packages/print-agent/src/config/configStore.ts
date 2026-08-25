import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import type { AgentConfig, PrintStation } from '../types.js';

const DEFAULT_CONFIG: AgentConfig = {
  port: 9898,
  stations: [],
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
    } catch {}

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

  public getStations(): PrintStation[] {
    return this.currentConfig.stations || [];
  }

  public addOrUpdateStation(station: Partial<PrintStation> & { token: string; targetPrinter: string }): PrintStation {
    const stations = this.currentConfig.stations || [];
    const existingIndex = stations.findIndex(s => s.id === station.id || (s.token && s.token === station.token));

    const serverUrl = (station.serverUrl || 'https://app.usecardap.com.br').replace(/\/$/, '');

    const newStation: PrintStation = {
      id: station.id || `stn_${randomUUID().substring(0, 8)}`,
      name: station.name || 'Terminal Cozinha / Caixa',
      serverUrl,
      token: station.token.trim(),
      targetPrinter: station.targetPrinter.trim(),
      sector: station.sector || 'TODOS',
      enabled: station.enabled ?? true,
      status: 'DESCONECTADO'
    };

    if (existingIndex >= 0) {
      stations[existingIndex] = { ...stations[existingIndex], ...newStation };
    } else {
      stations.push(newStation);
    }

    this.currentConfig.stations = stations;
    this.save();
    return newStation;
  }

  public deleteStation(idOrToken: string): boolean {
    const initialLen = this.currentConfig.stations.length;
    this.currentConfig.stations = this.currentConfig.stations.filter(
      s => s.id !== idOrToken && s.token !== idOrToken
    );
    const changed = this.currentConfig.stations.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  public updateStationStatus(id: string, status: PrintStation['status'], extra: { restaurantName?: string; lastError?: string; lastPingAt?: string } = {}): void {
    const station = this.currentConfig.stations.find(s => s.id === id);
    if (station) {
      station.status = status;
      if (extra.restaurantName) station.restaurantName = extra.restaurantName;
      if (extra.lastError !== undefined) station.lastError = extra.lastError;
      if (extra.lastPingAt) station.lastPingAt = extra.lastPingAt;
    }
  }

  public updateConfig(partial: Partial<AgentConfig>): AgentConfig {
    this.currentConfig = {
      ...this.currentConfig,
      ...partial
    };
    this.save();
    return this.getConfig();
  }

  private load(): AgentConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          stations: Array.isArray(parsed.stations) ? parsed.stations : []
        };
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
