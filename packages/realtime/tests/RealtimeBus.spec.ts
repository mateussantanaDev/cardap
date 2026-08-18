import { describe, it, expect } from 'vitest';
import { RealtimeBus, realtimeBus } from '../src/services/RealtimeBus';

describe('Etapa 5: Realtime Server & SSE Event Bus', () => {
  it('deve publicar e transmitir eventos em tempo real para assinantes', () => {
    let receivedPayload: any = null;

    const unsubscribe = realtimeBus.subscribe((event) => {
      receivedPayload = event;
    });

    realtimeBus.publish('ORDER_EVENT', 'ORDER_CREATED', {
      orderId: 'ord-999',
      orderNumber: 199,
      status: 'RECEBIDO'
    });

    expect(receivedPayload).not.toBeNull();
    expect(receivedPayload.topic).toBe('ORDER_EVENT');
    expect(receivedPayload.type).toBe('ORDER_CREATED');
    expect(receivedPayload.data.orderNumber).toBe(199);

    unsubscribe();
  });
});
