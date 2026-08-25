import { configStore } from '../config/configStore.js';
import { WindowsSpooler } from '../spooler/windowsSpooler.js';
import { EscPosBuilder } from '../spooler/escpos.js';
import type { PrintSector } from '../types.js';

export class CloudSyncService {
  private static instance: CloudSyncService;
  private isRunning = false;
  private isConnected = false;
  private abortController: AbortController | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  public getStatus(): { isRunning: boolean; isConnected: boolean; restaurantId: string; deviceName: string } {
    const config = configStore.getConfig();
    return {
      isRunning: this.isRunning,
      isConnected: this.isConnected,
      restaurantId: config.restaurantId || 'Não Vinculado',
      deviceName: config.deviceName
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[CloudSync] Iniciando serviço de sincronização com a nuvem Cardap...');
    this.connectLoop();
  }

  public stop(): void {
    this.isRunning = false;
    this.isConnected = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    console.log('[CloudSync] Serviço de sincronização parado.');
  }

  private async connectLoop(): Promise<void> {
    if (!this.isRunning) return;

    const config = configStore.getConfig();
    if (!config.token || !config.serverUrl) {
      // Sem token de pareamento configurado ainda
      this.isConnected = false;
      this.scheduleRetry(10000);
      return;
    }

    try {
      this.abortController = new AbortController();
      const streamUrl = `${config.serverUrl.replace(/\/$/, '')}/api/realtime/printer-queue`;

      console.log(`[CloudSync] Conectando ao canal de impressão: ${streamUrl}`);

      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'X-Device-Name': config.deviceName,
          'Accept': 'text/event-stream'
        },
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.isConnected = true;
      console.log(`[CloudSync] Conectado com sucesso à nuvem! Aguardando pedidos para o restaurante...`);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Não foi possível ler o stream da resposta.');
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
          this.handleEventBlock(block);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn(`[CloudSync] Conexão com a nuvem perdida (${err.message}). Reconectando em 5 segundos...`);
      }
      this.isConnected = false;
    }

    this.scheduleRetry(5000);
  }

  private scheduleRetry(delayMs: number): void {
    if (!this.isRunning) return;
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = setTimeout(() => this.connectLoop(), delayMs);
  }

  private async handleEventBlock(block: string): Promise<void> {
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

    if (!dataStr || dataStr === ': ping') return;

    try {
      const payload = JSON.parse(dataStr);

      if (eventType === 'PRINT_JOB' || payload.type === 'PRINT_JOB') {
        await this.processIncomingPrintJob(payload);
      }
    } catch {
      // Ignora heartbeats ou dados malformados
    }
  }

  private async processIncomingPrintJob(job: {
    jobId: string;
    sector?: PrintSector;
    content: string;
    printerName?: string;
    cut?: boolean;
    openDrawer?: boolean;
    beep?: boolean;
  }): Promise<void> {
    const config = configStore.getConfig();
    const sector = job.sector || 'TODOS';

    // Valida se esta máquina atende este setor
    const allowed = config.allowedSectors.includes('TODOS') || config.allowedSectors.includes(sector);
    if (!allowed) {
      console.log(`[CloudSync] Job #${job.jobId} ignorado (Setor "${sector}" não configurado nesta máquina).`);
      return;
    }

    // Identifica impressora de destino
    const targetPrinter =
      job.printerName ||
      (sector === 'COZINHA' ? config.printers.COZINHA : '') ||
      (sector === 'CAIXA' ? config.printers.CAIXA : '') ||
      (sector === 'BAR' ? config.printers.BAR : '') ||
      (sector === 'DELIVERY' ? config.printers.DELIVERY : '') ||
      config.printers.DEFAULT ||
      '';

    if (!targetPrinter) {
      console.warn(`[CloudSync] Nenhuma impressora configurada para o setor "${sector}".`);
      return;
    }

    console.log(`[CloudSync] 🖨️ Imprimindo Pedido da Nuvem no setor [${sector}] na impressora "${targetPrinter}"...`);

    const escposBuffer = EscPosBuilder.fromPlainText(job.content, {
      cut: job.cut ?? config.autoCut,
      openDrawer: job.openDrawer ?? (sector === 'CAIXA' && config.cashDrawerOnCashSale),
      beep: job.beep ?? (sector === 'COZINHA' && config.beepOnKitchenOrder)
    });

    const result = await WindowsSpooler.printRaw(targetPrinter, escposBuffer);
    if (result.success) {
      console.log(`[CloudSync] ✅ Impressão do Job #${job.jobId} finalizada com sucesso!`);
    } else {
      console.error(`[CloudSync] ❌ Falha ao imprimir Job #${job.jobId}:`, result.error);
    }
  }
}

export const cloudSync = CloudSyncService.getInstance();
