export interface PrintableOrderItem {
  productName: string;
  quantity: number;
  unitPriceFormatted: string;
  totalPriceFormatted: string;
  notes?: string;
  assemblies?: Array<{ name: string }>;
  modifiers?: Array<{ name: string }>;
  complements?: Array<{ name: string }>;
}

export interface PrintableOrder {
  orderNumber: number;
  type: 'SALAO' | 'BALCAO' | 'DELIVERY';
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  tableNumber?: number;
  customerName?: string;
  customerPhone?: string;
  subtotalFormatted: string;
  deliveryFeeFormatted: string;
  discountFormatted: string;
  totalAmountFormatted: string;
  createdAt: Date | string;
  items: PrintableOrderItem[];
}

export interface AgentStatusResponse {
  status: 'ONLINE' | 'OFFLINE';
  name: string;
  version: string;
  platform: string;
  hostname: string;
  port: number;
  config: {
    restaurantId: string;
    restaurantName?: string;
    deviceName: string;
    allowedSectors: string[];
    printers: Record<string, string>;
    autoCut: boolean;
  };
  cloudConnected: boolean;
}

export interface DetectedWindowsPrinter {
  name: string;
  portName?: string;
  driverName?: string;
  isDefault: boolean;
  status: string;
}

export interface PrintDirectResult {
  success: boolean;
  via: 'LOCAL_AGENT' | 'FALLBACK_BROWSER';
  printerUsed?: string;
  error?: string;
}

/**
 * Utilitário e Cliente de Impressão Térmica ESC/POS (48 colunas de largura fixa).
 * Integra-se diretamente com o Cardap Local Print Agent (localhost:9898) para impressão 100% silenciosa.
 */
export class PrinterService {
  private static COLS = 48;
  private static AGENT_URL = 'http://127.0.0.1:9898';

  private static center(text: string): string {
    const spaces = Math.max(0, Math.floor((this.COLS - text.length) / 2));
    return ' '.repeat(spaces) + text;
  }

  private static line(char = '-'): string {
    return char.repeat(this.COLS);
  }

  private static justify(left: string, right: string): string {
    const available = this.COLS - right.length;
    if (left.length > available - 1) {
      left = left.substring(0, available - 2) + '..';
    }
    const spaces = Math.max(1, available - left.length);
    return left + ' '.repeat(spaces) + right;
  }

  /**
   * Verifica se o Cardap Local Print Agent está rodando na máquina Windows (porta 9898)
   */
  public static async checkAgentStatus(): Promise<AgentStatusResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${this.AGENT_URL}/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Consulta a lista real de impressoras instaladas no Windows através do Agente Local
   */
  public static async listWindowsPrinters(): Promise<DetectedWindowsPrinter[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.AGENT_URL}/printers`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data.printers || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Envia comando de impressão direta e silenciosa para o Agente Local
   */
  public static async printDirect(
    order: PrintableOrder,
    sector: 'CAIXA' | 'COZINHA' | 'BAR' | 'DELIVERY' = 'COZINHA',
    options: { copies?: number; cut?: boolean; beep?: boolean; printerName?: string } = {}
  ): Promise<PrintDirectResult> {
    const content =
      sector === 'COZINHA'
        ? this.generateKitchenReceiptText(order)
        : this.generateReceiptText(order);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.AGENT_URL}/imprimir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector,
          printerName: options.printerName,
          content,
          cut: options.cut ?? true,
          beep: options.beep ?? (sector === 'COZINHA'),
          copies: options.copies ?? 1
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          via: 'LOCAL_AGENT',
          printerUsed: data.printerUsed
        };
      }

      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        via: 'LOCAL_AGENT',
        error: errorData.error || `HTTP ${res.status}`
      };
    } catch (err: any) {
      // Agente offline ou indisponível
      return {
        success: false,
        via: 'FALLBACK_BROWSER',
        error: 'Cardap Print Agent não encontrado em http://127.0.0.1:9898.'
      };
    }
  }

  /**
   * Realiza impressão de teste direto na impressora física
   */
  public static async testPrint(printerName?: string): Promise<{ success: boolean; error?: string; printerUsed?: string }> {
    try {
      const res = await fetch(`${this.AGENT_URL}/test-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao comunicar com o agente local.' };
    }
  }

  /**
   * Vincula a máquina ao restaurante em 1 clique via Web
   */
  public static async pairAgent(params: {
    token: string;
    restaurantId: string;
    restaurantName: string;
    deviceName?: string;
    printers?: Record<string, string>;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${this.AGENT_URL}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          serverUrl: typeof window !== 'undefined' ? window.location.origin : ''
        })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: 'Não foi possível conectar ao Agente Local em http://127.0.0.1:9898.' };
    }
  }

  /**
   * Comanda de Produção para Cozinha / KDS (Foco em clareza, itens e observações)
   */
  public static generateKitchenReceiptText(order: PrintableOrder): string {
    const lines: string[] = [];
    const dateObj = new Date(order.createdAt);

    lines.push(this.center('*** COMANDA DE PRODUÇÃO (COZINHA) ***'));
    lines.push(this.line('='));

    const typeLabel = order.type === 'SALAO' ? `MESA ${order.tableNumber || '?'}` : order.type;
    lines.push(this.justify(`PEDIDO: #${order.orderNumber}`, `LOCAL: ${typeLabel}`));
    lines.push(this.justify(`HORA: ${dateObj.toLocaleTimeString('pt-BR')}`, `STATUS: ${order.status}`));
    if (order.customerName) {
      lines.push(this.justify(`CLIENTE: ${order.customerName}`, ''));
    }
    lines.push(this.line('='));

    lines.push(this.justify('QTD  ITEM / PRODUTO', 'OBSERVAÇÕES'));
    lines.push(this.line('-'));

    for (const item of order.items) {
      lines.push(`${item.quantity}x  ${item.productName.toUpperCase()}`);

      if (item.assemblies && item.assemblies.length > 0) {
        for (const asm of item.assemblies) {
          lines.push(`     [+] ${asm.name}`);
        }
      }
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          lines.push(`     [*] ${mod.name}`);
        }
      }
      if (item.complements && item.complements.length > 0) {
        for (const cmp of item.complements) {
          lines.push(`     [+] ${cmp.name}`);
        }
      }
      if (item.notes) {
        lines.push(`     >>> ATENÇÃO: ${item.notes.toUpperCase()} <<<`);
      }
      lines.push('');
    }

    lines.push(this.line('='));
    lines.push(this.center('CARDAP ERP — COZINHA & BAR'));
    lines.push('\n\n\n');

    return lines.join('\n');
  }

  /**
   * Cupom do Caixa / Cliente (com valores financeiros)
   */
  public static generateReceiptText(order: PrintableOrder, cashierName = 'Operador de Caixa'): string {
    const lines: string[] = [];
    const dateObj = new Date(order.createdAt);

    lines.push(this.center('CARDAP ERP & PDV'));
    lines.push(this.center('Comprovante Não Fiscal de Venda'));
    lines.push(this.center('CNPJ: 12.345.678/0001-90 | Tel: (11) 99999-8888'));
    lines.push(this.line('='));

    const typeLabel = order.type === 'SALAO' ? `MESA ${order.tableNumber || '?'}` : order.type;
    lines.push(this.justify(`PEDIDO: #${order.orderNumber}`, `TIPO: ${typeLabel}`));
    lines.push(this.justify(`DATA: ${dateObj.toLocaleDateString('pt-BR')}`, `HORA: ${dateObj.toLocaleTimeString('pt-BR')}`));
    lines.push(this.justify(`OPERADOR: ${cashierName}`, `PAGTO: ${order.paymentMethod}`));
    if (order.customerName) {
      lines.push(this.justify(`CLIENTE: ${order.customerName}`, `FONE: ${order.customerPhone || 'N/I'}`));
    }
    lines.push(this.line('-'));

    lines.push(this.justify('QTD ITEM', 'VALOR (R$)'));
    lines.push(this.line('-'));

    for (const item of order.items) {
      const itemHeader = `${item.quantity}x ${item.productName}`;
      lines.push(this.justify(itemHeader, item.totalPriceFormatted));

      if (item.assemblies && item.assemblies.length > 0) {
        for (const asm of item.assemblies) {
          lines.push(`   + ${asm.name}`);
        }
      }
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          lines.push(`   * ${mod.name}`);
        }
      }
      if (item.complements && item.complements.length > 0) {
        for (const cmp of item.complements) {
          lines.push(`   + ${cmp.name}`);
        }
      }
      if (item.notes) {
        lines.push(`   [OBS: ${item.notes}]`);
      }
    }

    lines.push(this.line('-'));

    lines.push(this.justify('SUBTOTAL:', order.subtotalFormatted));
    if (order.deliveryFeeFormatted !== 'R$ 0,00') {
      lines.push(this.justify('TAXA ENTREGA:', order.deliveryFeeFormatted));
    }
    if (order.discountFormatted !== 'R$ 0,00') {
      lines.push(this.justify('DESCONTO:', `- ${order.discountFormatted}`));
    }
    lines.push(this.line('='));
    lines.push(this.justify('TOTAL DO PEDIDO:', order.totalAmountFormatted));
    lines.push(this.line('='));

    lines.push(this.center('SISTEMA CARDAP ERP — VIA OPERACIONAL'));
    lines.push(this.center('Obrigado pela preferência! Volte Sempre.'));
    lines.push('\n\n\n');

    return lines.join('\n');
  }
}
