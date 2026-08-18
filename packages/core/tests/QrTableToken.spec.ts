import { describe, it, expect } from 'vitest';
import { QrTableToken } from '../src/domain/value-objects/QrTableToken';

describe('Value Object: QrTableToken (Segurança Criptográfica de Mesas)', () => {
  const secretKey = 'super-secret-hmac-key-for-table-tokens-2026';

  it('deve gerar e verificar um token de mesa válido', () => {
    const tokenObj = QrTableToken.create('table-12', 12, secretKey);
    const rawToken = tokenObj.getRawToken();

    expect(rawToken).toContain('.');
    
    const verified = QrTableToken.parseAndVerify(rawToken, secretKey);
    expect(verified.getTableId()).toBe('table-12');
    expect(verified.getTableNumber()).toBe(12);
  });

  it('deve rejeitar tokens adulterados (ex: trocando o número da mesa no payload)', () => {
    const tokenObj = QrTableToken.create('table-12', 12, secretKey);
    const rawToken = tokenObj.getRawToken();

    const [payload, signature] = rawToken.split('.');
    
    // Adulterar payload para tentar fingir ser a mesa 99
    const tamperedPayloadObj = { tableId: 'table-99', tableNumber: 99, issuedAt: Date.now() };
    const tamperedPayload = Buffer.from(JSON.stringify(tamperedPayloadObj)).toString('base64url');
    const tamperedToken = `${tamperedPayload}.${signature}`;

    expect(() => QrTableToken.parseAndVerify(tamperedToken, secretKey)).toThrow('Tentativa de adulteração detectada');
  });

  it('deve rejeitar validação se for usada uma chave secreta incorreta no servidor', () => {
    const tokenObj = QrTableToken.create('table-12', 12, secretKey);
    const rawToken = tokenObj.getRawToken();
    const wrongSecret = 'wrong-secret-key-123456';

    expect(() => QrTableToken.parseAndVerify(rawToken, wrongSecret)).toThrow('Tentativa de adulteração detectada');
  });
});
