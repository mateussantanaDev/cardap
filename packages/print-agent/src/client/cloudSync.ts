import { configStore } from '../config/configStore.js';
import { WindowsSpooler } from '../spooler/windowsSpooler.js';
import { EscPosBuilder } from '../spooler/escpos.js';
import type { PrintStation, PrintSector } from '../types.js';

interface ActiveStream {
  stationId: string;
  abortController: AbortController;
  retryTimeout?: NodeJS.Timeout;
}

export class CloudSyncService {
  private static instance: CloudSyncService;
  private isRunning = false;
  private activeStreams: Map<string, ActiveStream> = new Map();

  private constructor() {}

  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  public getStatus(): { isRunning: boolean; stationsCount: number; activeConnections: number } {
    return {
      isRunning: this.isRunning,
      stationsCount: configStore.getStations().length,
      activeConnections: this.activeStreams.size
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[CloudSync] Iniciando gerenciador de conexões em tempo real...');
    this.syncAllStations();
  }

  public stop(): void {
    this.isRunning = false;
    for (const [id, stream] of this.activeStreams.entries()) {
      if (stream.retryTimeout) clearTimeout(stream.retryTimeout);
      stream.abortController.abort();
    }
    this.activeStreams.clear();
    console.log('[CloudSync] Todas as conexões de impressão em nuvem foram encerradas.');
  }

  public reload(): void {
    this.stop();
    this.start();
  }

  private syncAllStations(): void {
    const stations = configStore.getStations();
    if (stations.length === 0) {
      console.log('[CloudSync] Nenhum Ponto de Impressão (Station) cadastrado no momento.');
      return;
    }

    for (const station of stations) {
      if (station.enabled !== false) {
        this.startStationStream(station);
      }
    }
  }

  private async startStationStream(station: PrintStation): Promise<void> {
    if (!this.isRunning) return;
    if (!station.token || !station.serverUrl) {
      configStore.updateStationStatus(station.id, 'ERRO', { lastError: 'URL do Servidor ou Token ausente' });
      return;
    }

    // Se já estiver rodando, cancela anterior
    if (this.activeStreams.has(station.id)) {
      const existing = this.activeStreams.get(station.id);
      if (existing?.retryTimeout) clearTimeout(existing.retryTimeout);
      existing?.abortController.abort();
      this.activeStreams.delete(station.id);
    }

    const abortController = new AbortController();
    this.activeStreams.set(station.id, { stationId: station.id, abortController });

    const streamUrl = `${station.serverUrl.replace(/\/$/, '')}/api/realtime/printer-queue`;

    try {
      configStore.updateStationStatus(station.id, 'RECONECTANDO');
      console.log(`[CloudSync] Conectando Ponto "${station.name}" (${station.serverUrl}) -> Impressora: "${station.targetPrinter}"...`);

      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${station.token}`,
          'X-Station-Name': station.name,
          'Accept': 'text/event-stream'
        },
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      configStore.updateStationStatus(station.id, 'CONECTADO', {
        lastPingAt: new Date().toISOString(),
        lastError: ''
      });
      console.log(`[CloudSync] ✅ Ponto "${station.name}" CONECTADO à nuvem com sucesso!`);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Não foi possível inicializar a leitura do stream SSE.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (this.isRunning) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          this.handleEventBlock(station, block);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn(`[CloudSync] Conexão com Ponto "${station.name}" perdida: ${err.message}. Reconectando em 5s...`);
        configStore.updateStationStatus(station.id, 'ERRO', { lastError: err.message });
      }
    }

    this.activeStreams.delete(station.id);

    // Agenda reconexão se o serviço ainda estiver ativo
    if (this.isRunning) {
      const retryTimeout = setTimeout(() => {
        const currentStation = configStore.getStations().find(s => s.id === station.id);
        if (currentStation && currentStation.enabled !== false) {
          this.startStationStream(currentStation);
        }
      }, 5000);

      this.activeStreams.set(station.id, { stationId: station.id, abortController, retryTimeout });
    }
  }

  private async handleEventBlock(station: PrintStation, block: string): Promise<void> {
    const lines = block.split('\n');
    let eventType = 'message';
    let dataStr = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.replace('event:', '').trim();
      } else if (line.startsWith('data:')) {
        dataStr = line.replace('data:', '').trim();
      }
    }

    if (!dataStr || dataStr === ': ping') {
      configStore.updateStationStatus(station.id, 'CONECTADO', { lastPingAt: new Date().toISOString() });
      return;
    }

    try {
      const payload = JSON.parse(dataStr);

      if (eventType === 'connected') {
        if (payload.restaurantName) {
          configStore.updateStationStatus(station.id, 'CONECTADO', {
            restaurantName: payload.restaurantName,
            lastPingAt: new Date().toISOString()
          });
          console.log(`[CloudSync] Ponto "${station.name}" vinculado a: "${payload.restaurantName}"`);
        }
        return;
      }

      if (eventType === 'PRINT_JOB' || payload.type === 'PRINT_JOB') {
        await this.processIncomingPrintJob(station, payload);
      }
    } catch (err) {
      // Ignora heartbeats malformados
    }
  }

  private async processIncomingPrintJob(station: PrintStation, job: {
    jobId: string;
    sector?: PrintSector;
    content: string;
    printerName?: string;
    cut?: boolean;
    openDrawer?: boolean;
    beep?: boolean;
  }): Promise<void> {
    const config = configStore.getConfig();
    const targetPrinter = job.printerName || station.targetPrinter;

    if (!targetPrinter) {
      console.warn(`[CloudSync] Ponto "${station.name}" recebeu Job #${job.jobId}, mas não há impressora configurada.`);
      return;
    }

    console.log(`[CloudSync] 🖨️ Imprimindo Pedido da Nuvem no Ponto "${station.name}" na impressora "${targetPrinter}"...`);

    const escposBuffer = EscPosBuilder.fromPlainText(job.content, {
      cut: job.cut ?? config.autoCut,
      openDrawer: job.openDrawer ?? (station.sector === 'CAIXA' && config.cashDrawerOnCashSale),
      beep: job.beep ?? (station.sector === 'COZINHA' && config.beepOnKitchenOrder)
    });

    const result = await WindowsSpooler.printRaw(targetPrinter, escposBuffer);
    if (result.success) {
      configStore.updateStationStatus(station.id, 'CONECTADO', { lastPrintAt: new Date().toISOString() });
      console.log(`[CloudSync] ✅ Impressão no Ponto "${station.name}" concluída com sucesso!`);
    } else {
      console.error(`[CloudSync] ❌ Falha ao imprimir no Ponto "${station.name}":`, result.error);
    }
  }
}

export const cloudSync = CloudSyncService.getInstance();
