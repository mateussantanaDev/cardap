import type { PageServerLoad } from './$types';
import { prisma, PrismaOrderRepository } from '@cardap/database';

const orderRepo = new PrismaOrderRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let orders: any[] = [];

  try {
    const rawOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
      },
      include: {
        items: {
          include: {
            assemblies: true,
            modifiers: true,
            complements: true
          }
        },
        table: true
      },
      orderBy: { createdAt: 'asc' }
    });

    orders = rawOrders.map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      type: o.type,
      status: o.status,
      customerName: o.customerName || (o.type === 'SALAO' ? `Mesa ${o.table?.number || ''}` : 'Cliente'),
      customerPhone: o.customerPhone || '',
      tableNumber: o.table?.number || undefined,
      createdAt: o.createdAt.toISOString(),
      slaMinutes: o.type === 'DELIVERY' ? 40 : 20,
      totalAmountFormatted: `R$ ${(Number(o.totalAmount || 0)).toFixed(2).replace('.', ',')}`,
      items: o.items.map((i: any) => ({
        id: i.id || i.productId,
        name: i.productName,
        quantity: i.quantity,
        notes: i.notes || '',
        assemblies: i.assemblies ? i.assemblies.map((a: any) => a.name) : []
      }))
    }));
  } catch (err) {
    console.warn('Erro ao carregar KDS no SSR via Prisma direct:', err);
    try {
      const fallbackOrders = await orderRepo.findKdsActiveOrders();
      orders = fallbackOrders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        type: o.type,
        status: o.status,
        customerName: o.customerName || (o.type === 'SALAO' ? `Mesa ${o.tableNumber}` : 'Cliente'),
        customerPhone: o.customerPhone || '',
        tableNumber: o.tableNumber,
        createdAt: o.createdAt.toISOString(),
        slaMinutes: o.type === 'DELIVERY' ? 40 : 20,
        totalAmountFormatted: `R$ ${(o.totalAmountCents / 100).toFixed(2).replace('.', ',')}`,
        items: o.items.map((i: any) => ({
          id: i.id || i.productId,
          name: i.productName,
          quantity: i.quantity,
          notes: i.notes || '',
          assemblies: i.assemblies ? i.assemblies.map((a: any) => a.name) : []
        }))
      }));
    } catch {}
  }

  return {
    orders
  };
};
