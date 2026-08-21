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
      // 1. Garantir que shiftId existe
      let validShiftId = order.shiftId;
      const shiftExists = await prisma.cashShift.findUnique({ where: { id: validShiftId } });
      if (!shiftExists) {
        const activeShift = await prisma.cashShift.findFirst({
          where: { status: 'ABERTO' },
          orderBy: { openedAt: 'desc' }
        });
        if (activeShift) {
          validShiftId = activeShift.id;
        } else {
          const user = await prisma.user.findFirst();
          const newShift = await prisma.cashShift.create({
            data: {
              openedByUserId: user?.id || 'admin-system',
              initialAmount: 0,
              status: 'ABERTO'
            }
          });
          validShiftId = newShift.id;
        }
      }

      // 2. Garantir que productId existe para cada item
      let defaultProductId: string | null = null;
      const verifiedItems: any[] = [];

      for (const item of order.items) {
        let validProdId = item.productId;
        const prodExists = await prisma.product.findUnique({ where: { id: validProdId } });
        if (!prodExists) {
          if (!defaultProductId) {
            const firstProd = await prisma.product.findFirst({ select: { id: true } });
            if (firstProd) {
              defaultProductId = firstProd.id;
            } else {
              const firstCat = await prisma.category.findFirst({ select: { id: true } });
              const createdProd = await prisma.product.create({
                data: {
                  name: item.productName || 'Item do Pedido',
                  code: 'ITEM-AUTO',
                  price: item.unitPrice.toDecimal(),
                  categoryId: firstCat?.id || 'cat-default'
                }
              });
              defaultProductId = createdProd.id;
            }
          }
          validProdId = defaultProductId;
        }

        // Valida opções de montagem
        const verifiedAssemblies: any[] = [];
        for (const a of item.assemblies) {
          const asmExists = await prisma.assemblyOption.findUnique({ where: { id: a.id } });
          if (asmExists) {
            verifiedAssemblies.push({
              assemblyOptionId: a.id,
              name: a.name,
              priceAdjustment: a.priceAdjustment.toDecimal(),
              quantity: a.quantity
            });
          }
        }

        // Valida modificadores
        const verifiedModifiers: any[] = [];
        for (const m of item.modifiers) {
          const modExists = await prisma.productModifierOption.findUnique({ where: { id: m.id } });
          if (modExists) {
            verifiedModifiers.push({
              modifierOptionId: m.id,
              name: m.name,
              priceAdjustment: m.priceAdjustment.toDecimal()
            });
          }
        }

        // Valida complementos
        const verifiedComplements: any[] = [];
        for (const c of item.complements) {
          const compExists = await prisma.complementOption.findUnique({ where: { id: c.id } });
          if (compExists) {
            verifiedComplements.push({
              complementOptionId: c.id,
              name: c.name,
              price: c.priceAdjustment.toDecimal(),
              quantity: c.quantity
            });
          }
        }

        verifiedItems.push({
          id: item.id,
          productId: validProdId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toDecimal(),
          totalPrice: item.calculateTotal().toDecimal(),
          notes: item.notes,
          modifiers: verifiedModifiers.length > 0 ? { create: verifiedModifiers } : undefined,
          assemblies: verifiedAssemblies.length > 0 ? { create: verifiedAssemblies } : undefined,
          complements: verifiedComplements.length > 0 ? { create: verifiedComplements } : undefined
        });
      }

      // 3. Criação segura do pedido no PostgreSQL
      await prisma.order.create({
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          type: order.type,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal.toDecimal(),
          deliveryFee: order.deliveryFee.toDecimal(),
          discountAmount: order.discountAmount.toDecimal(),
          totalAmount: order.totalAmount.toDecimal(),
          notes: order.notes,
          customerId: order.customerId,
          tableId: order.tableId,
          shiftId: validShiftId,
          createdAt: order.createdAt,
          items: {
            create: verifiedItems
          }
        }
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
        status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
      },
      orderBy: { createdAt: 'asc' },
      include: PrismaOrderRepository.includeRelations
    });

    return rawOrders.map(raw => OrderMapper.toDomain(raw as any));
  }

  async findActiveKdsOrders(): Promise<OrderEntity[]> {
    return this.findKdsActiveOrders();
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
