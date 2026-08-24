import { describe, it, expect } from 'vitest';
import { QrTableToken } from '../src/domain/value-objects/QrTableToken';
import { OrderEntity, OrderItem } from '../src/domain/entities/Order';
import { Money } from '../src/domain/value-objects/Money';

describe('Regras de Negócio: QR Code de Mesas e Cancelamento de Pedidos (Etapa 5)', () => {
  const secretKey = 'test-secret-key-123456789';

  it('deve gerar e verificar token de QR Code com assinatura HMAC-SHA256 íntegra', () => {
    const tokenObj = QrTableToken.create('table-uuid-7', 7, secretKey);
    const rawToken = tokenObj.getRawToken();

    expect(rawToken).toContain('.');
    const parts = rawToken.split('.');
    expect(parts.length).toBe(2);

    const verified = QrTableToken.parseAndVerify(rawToken, secretKey);
    expect(verified.getTableId()).toBe('table-uuid-7');
    expect(verified.getTableNumber()).toBe(7);
  });

  it('deve rejeitar QR Code adulterado com token inválido', () => {
    const tokenObj = QrTableToken.create('table-uuid-7', 7, secretKey);
    const tampered = tokenObj.getRawToken() + 'tampered';

    expect(() => {
      QrTableToken.parseAndVerify(tampered, secretKey);
    }).toThrow();
  });

  it('deve permitir o cancelamento de pedidos pendentes ou em preparo com justificativa', () => {
    const item = new OrderItem({
      id: 'item-1',
      productId: 'prod-pastel-1',
      productName: 'Pastel de Carne',
      unitPrice: Money.fromCents(1200),
      quantity: 2
    });

    const order = new OrderEntity({
      id: 'ord-table-1',
      orderNumber: 105,
      type: 'SALAO',
      tableId: 'table-uuid-7',
      paymentMethod: 'PIX',
      items: [item],
      shiftId: 'shift-1'
    });

    expect(order.status).toBe('PENDENTE');

    // Cancelar pedido
    const cancelRes = order.cancel('Cliente desistiu antes do preparo');
    expect(cancelRes.isSuccess).toBe(true);
    expect(order.status).toBe('CANCELADO');
    expect(order.cancellationReason).toBe('Cliente desistiu antes do preparo');
  });

  it('não deve permitir cancelamento de pedido já entregue ou sem motivo', () => {
    const item = new OrderItem({
      id: 'item-1',
      productId: 'prod-pastel-1',
      productName: 'Pastel de Carne',
      unitPrice: Money.fromCents(1200),
      quantity: 1
    });

    const order = new OrderEntity({
      id: 'ord-table-2',
      orderNumber: 106,
      type: 'SALAO',
      status: 'ENTREGUE',
      paymentMethod: 'PIX',
      items: [item],
      shiftId: 'shift-1'
    });

    const cancelRes = order.cancel('Tentativa inválida');
    expect(cancelRes.isFailure).toBe(true);
    expect(cancelRes.getError().message).toContain('já foi ENTREGUE');
  });
});
