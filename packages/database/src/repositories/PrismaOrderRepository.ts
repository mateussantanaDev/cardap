import { IOrderRepository, OrderFilterParams, OrderEntity } from '@cardap/core';
import { prisma } from '../client.js';
import { OrderMapper } from '../mappers/OrderMapper.js';

export class PrismaOrderRepository implements IOrderRepository {
  private static includeRelations = {
    items: {
      include: {
        product: { select: { name: true } },
        modifiers: true,
        assemblies: true,
        complements: true
      }
    }
  };

  /**
   * Salva ou atualiza um pedido utilizando transação relacional.
   */
  async save(order: OrderEntity): Promise<void> {
    const existing = await prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true }
    });

    if (!existing) {
      // Criação inicial do pedido e seus itens associados
      const createData = OrderMapper.toPrismaCreate(order);
      await prisma.order.create({
        data: createData
      });
    } else {
      // Atualização de status, valores e histórico de auditoria
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: order.status,
            paymentStatus: order.paymentStatus,
            discountAmount: order.discountAmount.toDecimal(),
            totalAmount: order.totalAmount.toDecimal(),
            cancellationReason: order.cancellationReason,
            updatedAt: order.updatedAt
          }
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: order.status,
            notes: order.cancellationReason || `Status alterado para ${order.status}`
          }
        })
      ]);
    }
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const raw = await prisma.order.findUnique({
      where: { id },
      include: PrismaOrderRepository.includeRelations
    });

    if (!raw) return null;
    return OrderMapper.toDomain(raw as any);
  }

  async findByOrderNumber(orderNumber: number): Promise<OrderEntity | null> {
    const raw = await prisma.order.findFirst({
      where: { orderNumber },
      orderBy: { createdAt: 'desc' },
      include: PrismaOrderRepository.includeRelations
    });

    if (!raw) return null;
    return OrderMapper.toDomain(raw as any);
  }

  async findActiveByTableId(tableId: string): Promise<OrderEntity[]> {
    const rawOrders = await prisma.order.findMany({
      where: {
        tableId,
        status: { notIn: ['ENTREGUE', 'CANCELADO'] }
      },
      orderBy: { createdAt: 'asc' },
      include: PrismaOrderRepository.includeRelations
    });

    return rawOrders.map(raw => OrderMapper.toDomain(raw as any));
  }

  async findKdsActiveOrders(): Promise<OrderEntity[]> {
    const rawOrders = await prisma.order.findMany({
      where: {
        status: { in: ['RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
      },
      orderBy: { createdAt: 'asc' },
      include: PrismaOrderRepository.includeRelations
    });

    return rawOrders.map(raw => OrderMapper.toDomain(raw as any));
  }

  async findMany(params: OrderFilterParams): Promise<OrderEntity[]> {
    const where: any = {};
    if (params.status && params.status.length > 0) {
      where.status = { in: params.status };
    }
    if (params.shiftId) where.shiftId = params.shiftId;
    if (params.tableId) where.tableId = params.tableId;
    if (params.type) where.type = params.type;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const rawOrders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: PrismaOrderRepository.includeRelations
    });

    return rawOrders.map(raw => OrderMapper.toDomain(raw as any));
  }

  /**
   * Obtém o próximo número sequencial de pedido do dia atual (ex: #101, #102...)
   */
  async getNextDailyOrderNumber(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const lastOrder = await prisma.order.findFirst({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true }
    });

    return (lastOrder?.orderNumber || 100) + 1;
  }
}
