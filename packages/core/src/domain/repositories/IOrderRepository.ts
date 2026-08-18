import { OrderEntity, OrderStatus } from '../entities/Order';

export interface OrderFilterParams {
  status?: OrderStatus[];
  shiftId?: string;
  tableId?: string;
  type?: 'SALAO' | 'BALCAO' | 'DELIVERY';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Interface do Repositório de Pedidos (Dependency Inversion)
 */
export interface IOrderRepository {
  /**
   * Salva ou atualiza um agregado de Pedido no armazenamento.
   */
  save(order: OrderEntity): Promise<void>;

  /**
   * Busca um pedido pelo seu ID único.
   */
  findById(id: string): Promise<OrderEntity | null>;

  /**
   * Busca um pedido pelo número sequencial diário.
   */
  findByOrderNumber(orderNumber: number): Promise<OrderEntity | null>;

  /**
   * Lista pedidos ativos de uma determinada mesa no salão.
   */
  findActiveByTableId(tableId: string): Promise<OrderEntity[]>;

  /**
   * Lista todos os pedidos ativos no Kanban KDS da cozinha (RECEBIDO, EM_PREPARO, PRONTO).
   */
  findKdsActiveOrders(): Promise<OrderEntity[]>;

  /**
   * Filtra pedidos por parâmetros operacionais (datas, status, tipo).
   */
  findMany(params: OrderFilterParams): Promise<OrderEntity[]>;

  /**
   * Obtém o próximo número sequencial de pedido do dia.
   */
  getNextDailyOrderNumber(): Promise<number>;
}
