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

export interface PrintableDeliveryAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  reference?: string;
}

export interface PrintableOrder {
  restaurantName?: string;
  restaurantPhone?: string;
  restaurantCnpj?: string;
  restaurantAddress?: string;
  orderNumber: number;
  type: 'SALAO' | 'BALCAO' | 'DELIVERY';
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  changeFor?: string;
  tableNumber?: number;
  customerName?: string;
  customerPhone?: string;
  customerCpf?: string;
  deliveryAddress?: PrintableDeliveryAddress;
  orderNotes?: string;
  subtotalFormatted: string;
  deliveryFeeFormatted: string;
  discountFormatted: string;
  totalAmountFormatted: string;
  createdAt: Date | string;
  items: PrintableOrderItem[];
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
 * Notinha Completa de Delivery, Guia do Motoboy, Comanda de Cozinha e Recibo de Caixa.
 */
export class PrinterService {
  private static COLS = 48;
  private static AGENT_URL = 'http://127.0.0.1:9898';

  private static center(text: string): string {
    const cleanText = text.trim();
    if (cleanText.length >= this.COLS) return cleanText.substring(0, this.COLS);
    const totalPadding = this.COLS - cleanText.length;
    const padLeft = Math.floor(totalPadding / 2);
    const padRight = totalPadding - padLeft;
    return ' '.repeat(padLeft) + cleanText + ' '.repeat(padRight);
  }

  private static line(char = '-'): string {
    return char.repeat(this.COLS);
  }

  private static justify(left: string, right: string): string {
    const cleanLeft = left.trim();
    const cleanRight = right.trim();
    const available = this.COLS - cleanLeft.length - cleanRight.length;
    if (available <= 0) {
      return `${cleanLeft} ${cleanRight}`;
    }
    return cleanLeft + ' '.repeat(available) + cleanRight;
  }

  /**
   * Verifica se o Cardap Print Agent está rodando localmente
   */
  public static async checkAgentStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${this.AGENT_URL}/api/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Consulta a lista real de impressoras instaladas através do Agente Local
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
      } else {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          via: 'LOCAL_AGENT',
          error: errData.error || `HTTP ${res.status}`
        };
      }
    } catch {
      return {
        success: false,
        via: 'FALLBACK_BROWSER',
        error: 'Agente local offline em http://127.0.0.1:9898'
      };
    }
  }

  /**
   * Comanda de Produção para Cozinha / KDS
   */
  public static generateKitchenReceiptText(order: PrintableOrder): string {
    const lines: string[] = [];
    const dateObj = new Date(order.createdAt);

    lines.push(this.line('='));
    lines.push(this.center('*** COMANDA DE PRODUCAO (COZINHA) ***'));
    lines.push(this.line('='));

    const typeLabel = order.type === 'SALAO' ? `MESA ${order.tableNumber || '?'}` : order.type;
    lines.push(this.justify(`PEDIDO: #${order.orderNumber}`, `LOCAL: ${typeLabel}`));
    lines.push(this.justify(`DATA: ${dateObj.toLocaleDateString('pt-BR')}`, `HORA: ${dateObj.toLocaleTimeString('pt-BR')}`));

    if (order.customerName) {
      lines.push(this.justify(`CLIENTE: ${order.customerName}`, order.customerPhone || ''));
    }
    lines.push(this.line('='));

    lines.push(this.justify('QTD  ITEM / PRODUTO', 'OBSERVACOES'));
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
        lines.push(`     >>> OBS: ${item.notes.toUpperCase()} <<<`);
      }
      lines.push('');
    }

    if (order.orderNotes) {
      lines.push(this.line('-'));
      lines.push(`OBS DO PEDIDO: ${order.orderNotes.toUpperCase()}`);
    }

    lines.push(this.line('='));
    lines.push(this.center(`${order.restaurantName || 'CARDAP ERP'} — COZINHA`));
    lines.push('\n\n\n');

    return lines.join('\n');
  }

  /**
   * Cupom Completo de Venda, Delivery & Guia do Motoboy
   */
  public static generateReceiptText(order: PrintableOrder, cashierName = 'Operador de Caixa'): string {
    const lines: string[] = [];
    const dateObj = new Date(order.createdAt);
    const restName = (order.restaurantName || 'CARDAP ERP').toUpperCase();

    // 1. Cabeçalho do Estabelecimento
    lines.push(this.line('='));
    lines.push(this.center(restName));
    if (order.restaurantAddress) {
      lines.push(this.center(order.restaurantAddress));
    }
    const contactLine = [
      order.restaurantPhone ? `Tel: ${order.restaurantPhone}` : '',
      order.restaurantCnpj ? `CNPJ: ${order.restaurantCnpj}` : ''
    ].filter(Boolean).join(' | ');
    if (contactLine) {
      lines.push(this.center(contactLine));
    }
    lines.push(this.line('='));

    // 2. Identificação do Pedido
    const isDelivery = order.type === 'DELIVERY';
    const typeLabel = order.type === 'SALAO' ? `MESA ${order.tableNumber || '?'}` : (isDelivery ? 'ENTREGA (DELIVERY)' : 'RETIRADA (BALCAO)');
    lines.push(this.justify(`PEDIDO: #${order.orderNumber}`, `TIPO: ${typeLabel}`));
    lines.push(this.justify(`DATA: ${dateObj.toLocaleDateString('pt-BR')}`, `HORA: ${dateObj.toLocaleTimeString('pt-BR')}`));
    lines.push(this.justify(`ATENDIMENTO: ${cashierName}`, `STATUS: ${order.status}`));
    lines.push(this.line('-'));

    // 3. Dados do Cliente
    lines.push(this.center('DADOS DO CLIENTE'));
    lines.push(`CLIENTE : ${order.customerName || 'Consumidor Final'}`);
    if (order.customerPhone) {
      lines.push(`TELEFONE: ${order.customerPhone}`);
    }
    if (order.customerCpf) {
      lines.push(`CPF     : ${order.customerCpf}`);
    }

    // 4. Guia de Entrega Completa para o Motoboy (se for Delivery)
    if (isDelivery && order.deliveryAddress) {
      const addr = order.deliveryAddress;
      lines.push(this.line('-'));
      lines.push(this.center('>>> GUIA DE ENTREGA / MOTOBOY <<<'));
      lines.push(this.line('-'));
      lines.push(`ENDERECO: ${addr.street || 'Nao informado'}, ${addr.number || 'S/N'}`);
      if (addr.complement) {
        lines.push(`COMPL.  : ${addr.complement}`);
      }
      if (addr.neighborhood || addr.city) {
        lines.push(`BAIRRO  : ${[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(' - ')}`);
      }
      if (addr.zipCode) {
        lines.push(`CEP     : ${addr.zipCode}`);
      }
      if (addr.reference) {
        lines.push(`P. REF. : ${addr.reference}`);
      }
    }

    // 5. Itens do Pedido
    lines.push(this.line('-'));
    lines.push(this.justify('QTD  ITEM / DESCRICAO', 'VALOR (R$)'));
    lines.push(this.line('-'));

    for (const item of order.items) {
      const itemHeader = `${item.quantity}x ${item.productName}`;
      lines.push(this.justify(itemHeader, item.totalPriceFormatted || item.unitPriceFormatted));

      if (item.assemblies && item.assemblies.length > 0) {
        for (const asm of item.assemblies) {
          lines.push(`   [+] ${asm.name}`);
        }
      }
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          lines.push(`   [*] ${mod.name}`);
        }
      }
      if (item.complements && item.complements.length > 0) {
        for (const cmp of item.complements) {
          lines.push(`   [+] ${cmp.name}`);
        }
      }
      if (item.notes) {
        lines.push(`   [OBS: ${item.notes}]`);
      }
    }

    // 6. Totais Financeiros
    lines.push(this.line('-'));
    lines.push(this.justify('SUBTOTAL:', order.subtotalFormatted));
    if (order.deliveryFeeFormatted && order.deliveryFeeFormatted !== 'R$ 0,00') {
      lines.push(this.justify('TAXA DE ENTREGA:', order.deliveryFeeFormatted));
    }
    if (order.discountFormatted && order.discountFormatted !== 'R$ 0,00') {
      lines.push(this.justify('DESCONTO:', `- ${order.discountFormatted}`));
    }
    lines.push(this.line('='));
    lines.push(this.justify('TOTAL DO PEDIDO:', order.totalAmountFormatted));
    lines.push(this.line('='));

    // 7. Informações de Pagamento & Troco
    lines.push(this.center('FORMA DE PAGAMENTO'));
    lines.push(`PAGAMENTO : ${order.paymentMethod.toUpperCase()}`);
    lines.push(`STATUS    : ${order.paymentStatus.toUpperCase()}`);

    if (order.changeFor) {
      lines.push(this.line('-'));
      lines.push(`>>> LEVAR TROCO: ${order.changeFor.toUpperCase()} <<<`);
    }

    if (order.orderNotes) {
      lines.push(this.line('-'));
      lines.push(`OBS GERAIS: ${order.orderNotes}`);
    }

    // 8. Rodapé & Agradecimento
    lines.push(this.line('='));
    lines.push(this.center('Obrigado pela preferencia!'));
    lines.push(this.center('Peca online: https://app.usecardap.com.br'));
    lines.push(this.line('='));
    lines.push('\n\n\n');

    return lines.join('\n');
  }
}
