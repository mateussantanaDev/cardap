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
  createdAt: Date;
  items: PrintableOrderItem[];
}

/**
 * Utilitário de Impressão Térmica ESC/POS (48 colunas de largura fixa).
 * Simula o buffer de impressão enviado para impressoras não fiscais (Epson, Bematech, Elgin).
 */
export class PrinterService {
  private static COLS = 48;

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
   * Gera o cupom em texto puro monoespaçado pronto para ser enviado via USB/Rede para a impressora.
   */
  public static generateReceiptText(order: PrintableOrder, cashierName = 'Operador de Caixa'): string {
    const lines: string[] = [];

    // Cabeçalho do Cupom
    lines.push(this.center('CARDAP ERP & PDV'));
    lines.push(this.center('Comanda de Operação — Impressão Térmica'));
    lines.push(this.center('CNPJ: 12.345.678/0001-90 | Tel: (11) 99999-8888'));
    lines.push(this.line('='));

    // Dados da Comanda
    const typeLabel = order.type === 'SALAO' ? `MESA ${order.tableNumber || '?'}` : order.type;
    lines.push(this.justify(`PEDIDO: #${order.orderNumber}`, `TIPO: ${typeLabel}`));
    lines.push(this.justify(`DATA: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`, `HORA: ${new Date(order.createdAt).toLocaleTimeString('pt-BR')}`));
    lines.push(this.justify(`OPERADOR: ${cashierName}`, `PAGTO: ${order.paymentMethod}`));
    if (order.customerName) {
      lines.push(this.justify(`CLIENTE: ${order.customerName}`, `FONE: ${order.customerPhone || 'N/I'}`));
    }
    lines.push(this.line('-'));

    // Cabeçalho dos Itens
    lines.push(this.justify('QTD ITEM', 'VALOR (R$)'));
    lines.push(this.line('-'));

    // Lista de Itens
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

    // Totais Financeiros
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

    // Rodapé
    lines.push(this.center('SISTEMA CARDAP ERP — VIA OPERACIONAL'));
    lines.push(this.center('Obrigado pela preferência! Volte Sempre.'));
    lines.push('\n\n\n'); // Corte de papel (Paper Cut ESC/POS)

    return lines.join('\n');
  }
}
