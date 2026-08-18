import { EventEmitter } from 'node:events';

export type KdsEventType = 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_CANCELLED';

export interface KdsEventPayload {
  eventId: string;
  eventType: KdsEventType;
  orderId: string;
  orderNumber: number;
  type: 'SALAO' | 'DELIVERY';
  previousStatus?: string;
  newStatus: string;
  tableNumber?: number;
  customerName?: string;
  timestamp: string;
}

export class KdsEventEmitter extends EventEmitter {
  private static instance: KdsEventEmitter;
  private eventHistory: Map<string, KdsEventPayload[]> = new Map();

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): KdsEventEmitter {
    if (!KdsEventEmitter.instance) {
      KdsEventEmitter.instance = new KdsEventEmitter();
    }
    return KdsEventEmitter.instance;
  }

  /**
   * Emite um evento de atualização do KDS para a comanda.
   */
  public emitKdsEvent(payload: KdsEventPayload): boolean {
    const history = this.eventHistory.get(payload.orderId) || [];
    history.push(payload);
    this.eventHistory.set(payload.orderId, history);

    // Emitir evento genérico do KDS e evento específico por orderId
    this.emit('kds-event', payload);
    this.emit(`order-${payload.orderId}`, payload);

    return true;
  }

  /**
   * Inscreve um ouvinte para atualizações em tempo real de um pedido específico.
   */
  public subscribeToOrder(orderId: string, listener: (payload: KdsEventPayload) => void): () => void {
    const eventName = `order-${orderId}`;
    this.on(eventName, listener);

    return () => {
      this.off(eventName, listener);
    };
  }

  /**
   * Obtém o histórico recente de eventos de uma comanda.
   */
  public getHistoryForOrder(orderId: string): KdsEventPayload[] {
    return this.eventHistory.get(orderId) || [];
  }
}

export const kdsEmitter = KdsEventEmitter.getInstance();
