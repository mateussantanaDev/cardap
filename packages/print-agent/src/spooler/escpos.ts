/**
 * Gerador e compilador de comandos binários ESC/POS para impressoras térmicas (80mm e 58mm).
 * Compatível com Epson, Bematech, Elgin, Daruma, Diebold, Elgin i9, TM-T20 e genéricas.
 */

export class EscPosBuilder {
  private buffer: Buffer[] = [];

  constructor() {
    this.init();
  }

  /**
   * Inicializa / reseta a impressora
   */
  public init(): this {
    this.buffer.push(Buffer.from([0x1b, 0x40])); // ESC @
    return this;
  }

  /**
   * Alinhamento do texto: 'left' | 'center' | 'right'
   */
  public align(alignment: 'left' | 'center' | 'right'): this {
    const code = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(Buffer.from([0x1b, 0x61, code])); // ESC a n
    return this;
  }

  /**
   * Negrito
   */
  public bold(enable = true): this {
    this.buffer.push(Buffer.from([0x1b, 0x45, enable ? 1 : 0])); // ESC E n
    return this;
  }

  /**
   * Tamanho do texto: 'normal' | 'double-height' | 'double-width' | 'quadruple'
   */
  public size(type: 'normal' | 'double-height' | 'double-width' | 'quadruple'): this {
    let mode = 0x00;
    if (type === 'double-height') mode = 0x01;
    else if (type === 'double-width') mode = 0x10;
    else if (type === 'quadruple') mode = 0x11;
    this.buffer.push(Buffer.from([0x1d, 0x21, mode])); // GS ! n
    return this;
  }

  /**
   * Escreve linha de texto com quebra
   */
  public textLine(text = ''): this {
    this.text(text + '\n');
    return this;
  }

  /**
   * Escreve texto cru (com tratamento básico de acentuação pt-BR)
   */
  public text(text: string): this {
    // Normaliza acentuação se necessário para padrão de impressora térmica
    const normalized = text
      .replace(/[\u0300-\u036f]/g, ''); // Remove marcas combinadas

    // Converte para Buffer latin1 / ascii
    const buf = Buffer.from(normalized, 'latin1');
    this.buffer.push(buf);
    return this;
  }

  /**
   * Linha divisória horizontal (ex: 48 caracteres para 80mm ou 32 para 58mm)
   */
  public separator(char = '-', cols = 48): this {
    this.textLine(char.repeat(cols));
    return this;
  }

  /**
   * Duas colunas justificadas: Esquerda e Direita (ex: "X-BURGER .... R$ 35,00")
   */
  public twoColumns(left: string, right: string, cols = 48): this {
    const available = cols - right.length;
    let truncatedLeft = left;
    if (truncatedLeft.length > available - 1) {
      truncatedLeft = truncatedLeft.substring(0, available - 2) + '..';
    }
    const spaces = Math.max(1, available - truncatedLeft.length);
    this.textLine(truncatedLeft + ' '.repeat(spaces) + right);
    return this;
  }

  /**
   * Alimenta N linhas de papel em branco
   */
  public feed(lines = 3): this {
    this.buffer.push(Buffer.from([0x1b, 0x64, lines])); // ESC d n
    return this;
  }

  /**
   * Corta o papel (Guilhotina automática)
   */
  public cut(partial = false): this {
    this.feed(3);
    if (partial) {
      this.buffer.push(Buffer.from([0x1d, 0x56, 0x01])); // GS V 1 (Partial Cut)
    } else {
      this.buffer.push(Buffer.from([0x1d, 0x56, 0x00])); // GS V 0 (Full Cut)
    }
    return this;
  }

  /**
   * Aciona abertura de Gaveta de Dinheiro conectada na porta RJ11 da impressora
   */
  public openDrawer(): this {
    // ESC p m t1 t2 (Pulso de 50ms no pino 2 da gaveta)
    this.buffer.push(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]));
    return this;
  }

  /**
   * Emite alerta sonoro (Bip) na impressora térmica
   */
  public beep(times = 2): this {
    this.buffer.push(Buffer.from([0x1b, 0x42, times, 0x02])); // ESC B n t
    return this;
  }

  /**
   * Compila e retorna o Buffer binário final pronto para envio ao spooler RAW
   */
  public build(): Buffer {
    return Buffer.concat(this.buffer);
  }

  /**
   * Converte texto simples monoespaçado gerado pelo PrinterService em comandos ESC/POS com corte
   */
  public static fromPlainText(text: string, options: { cut?: boolean; openDrawer?: boolean; beep?: boolean } = {}): Buffer {
    const builder = new EscPosBuilder();
    builder.init();

    if (options.openDrawer) {
      builder.openDrawer();
    }

    if (options.beep) {
      builder.beep(2);
    }

    builder.align('left');
    builder.text(text);

    if (options.cut !== false) {
      builder.cut();
    }

    return builder.build();
  }
}
