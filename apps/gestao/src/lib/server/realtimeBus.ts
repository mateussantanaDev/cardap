import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export type RealtimeTopic = 'ORDER_EVENT' | 'TABLE_EVENT' | 'CASH_EVENT';

export interface RealtimeEventPayload {
  id: string;
  topic: RealtimeTopic;
  type: string;
  data: any;
  timestamp: string;
}

class RealtimeBus extends EventEmitter {
  private static instance: RealtimeBus;

  private constructor() {
    super();
    this.setMaxListeners(200);
  }

  public static getInstance(): RealtimeBus {
    if (!RealtimeBus.instance) {
      RealtimeBus.instance = new RealtimeBus();
    }
    return RealtimeBus.instance;
  }

  public publish(topic: RealtimeTopic, type: string, data: any): void {
    const payload: RealtimeEventPayload = {
      id: randomUUID(),
      topic,
      type,
      data,
      timestamp: new Date().toISOString()
    };

    this.emit('realtime-event', payload);
    this.emit(topic, payload);
  }

  public subscribe(listener: (event: RealtimeEventPayload) => void): () => void {
    this.on('realtime-event', listener);
    return () => {
      this.off('realtime-event', listener);
    };
  }
}

export const realtimeBus = RealtimeBus.getInstance();
