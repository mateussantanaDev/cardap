import { kdsEmitter, KdsEventPayload, KdsEventType } from '../events/KdsEventEmitter';
import { randomUUID } from 'node:crypto';

export class KdsRealtimeService {
  /**
   * Dispara notificação de Novo Pedido no KDS da Cozinha.
   */
  public static notifyOrderCreated(order: {
    id: string;
    orderNumber: number;
    type: 'SALAO' | 'DELIVERY';
    status: string;
    tableNumber?: number;
    customerName?: string;
  }): KdsEventPayload {
    const payload: KdsEventPayload = {
      eventId: `evt-${randomUUID()}`,
      eventType: 'ORDER_CREATED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      newStatus: order.status,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      timestamp: new Date().toISOString()
    };

    kdsEmitter.emitKdsEvent(payload);
    return payload;
  }

  /**
   * Dispara notificação de Alteração de Status da Comanda no KDS.
   */
  public static notifyStatusChanged(params: {
    orderId: string;
    orderNumber: number;
    type: 'SALAO' | 'DELIVERY';
    previousStatus: string;
    newStatus: string;
    tableNumber?: number;
    customerName?: string;
  }): KdsEventPayload {
    const payload: KdsEventPayload = {
      eventId: `evt-${randomUUID()}`,
      eventType: params.newStatus === 'CANCELADO' ? 'ORDER_CANCELLED' : 'ORDER_STATUS_CHANGED',
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      type: params.type,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      tableNumber: params.tableNumber,
      customerName: params.customerName,
      timestamp: new Date().toISOString()
    };

    kdsEmitter.emitKdsEvent(payload);
    return payload;
  }

  /**
   * Inscreve um callback para ser notificado quando a comanda mudar de status.
   */
  public static subscribeToOrderUpdates(
    orderId: string,
    callback: (payload: KdsEventPayload) => void
  ): () => void {
    return kdsEmitter.subscribeToOrder(orderId, callback);
  }
}
