import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TableTokenPayload {
  tableId: string;
  tableNumber: number;
  issuedAt: number;
}

/**
 * Value Object: QrTableToken
 * Garante a integridade e autenticidade criptográfica de QR Codes de Mesas no Salão.
 * Impede que clientes B2C alterem manualmente o ID ou número da mesa na URL (?token=...).
 */
export class QrTableToken {
  private readonly tableId: string;
  private readonly tableNumber: number;
  private readonly rawToken: string;

  private constructor(tableId: string, tableNumber: number, rawToken: string) {
    if (!tableId || typeof tableId !== 'string') {
      throw new Error("QrTableToken requer um tableId válido.");
    }
    if (!tableNumber || !Number.isInteger(tableNumber) || tableNumber <= 0) {
      throw new Error("QrTableToken requer um tableNumber positivo.");
    }
    if (!rawToken || typeof rawToken !== 'string') {
      throw new Error("QrTableToken exige a string codificada do token.");
    }

    this.tableId = tableId;
    this.tableNumber = tableNumber;
    this.rawToken = rawToken;
  }

  /**
   * Assina e gera um novo QrTableToken seguro usando a chave secreta HMAC-SHA256 do servidor.
   */
  public static create(tableId: string, tableNumber: number, secretKey: string): QrTableToken {
    if (!secretKey || secretKey.length < 16) {
      throw new Error("A chave secreta HMAC do servidor deve ter no mínimo 16 caracteres.");
    }

    const payload: TableTokenPayload = {
      tableId,
      tableNumber,
      issuedAt: Date.now()
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = QrTableToken.signPayload(encodedPayload, secretKey);
    const rawToken = `${encodedPayload}.${signature}`;

    return new QrTableToken(tableId, tableNumber, rawToken);
  }

  /**
   * Valida, decodifica e verifica a assinatura criptográfica de um token recebido pela URL.
   * Lança erro caso o token tenha sido adulterado ou seja inválido.
   */
  public static parseAndVerify(rawToken: string, secretKey: string): QrTableToken {
    if (!rawToken || !rawToken.includes('.')) {
      throw new Error("Formato de token QR de mesa inválido.");
    }

    const [encodedPayload, providedSignature] = rawToken.split('.');
    if (!encodedPayload || !providedSignature) {
      throw new Error("Token malformado: payload ou assinatura ausente.");
    }

    // 1. Re-computar assinatura esperada
    const expectedSignature = QrTableToken.signPayload(encodedPayload, secretKey);

    // 2. Comparação segura contra ataques de timing
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new Error("Assinatura do token de mesa inválida! Tentativa de adulteração detectada.");
    }

    // 3. Decodificar payload
    try {
      const decodedJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
      const payload: TableTokenPayload = JSON.parse(decodedJson);

      return new QrTableToken(payload.tableId, payload.tableNumber, rawToken);
    } catch {
      throw new Error("Falha ao decodificar dados do payload do token de mesa.");
    }
  }

  private static signPayload(encodedPayload: string, secretKey: string): string {
    return createHmac('sha256', secretKey)
      .update(encodedPayload)
      .digest('base64url');
  }

  public getTableId(): string {
    return this.tableId;
  }

  public getTableNumber(): number {
    return this.tableNumber;
  }

  public getRawToken(): string {
    return this.rawToken;
  }

  /**
   * Monta a URL completa para ser codificada no QR Code impresso no salão.
   */
  public buildQrUrl(baseUrl: string): string {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}/?token=${this.rawToken}`;
  }
}
