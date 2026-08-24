import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const rawOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO']
        }
      },
      include: {
        customer: { select: { name: true, phone: true } },
        table: { select: { number: true } },
        items: {
          include: {
            product: { select: { name: true } },
            modifiers: true,
            assemblies: true,
            complements: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const now = Date.now();

    const orders = rawOrders.map(order => {
      const createdTime = new Date(order.createdAt).getTime();
      const elapsedMinutes = Math.floor((now - createdTime) / (1000 * 60));
      const slaMinutes = order.type === 'DELIVERY' ? 25 : 15;
      const totalAmountNum = Number(order.totalAmount || 0);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        status: order.status,
        customerName: order.customer?.name || (order.type === 'SALAO' && order.table?.number ? `Mesa ${order.table.number}` : (order.type === 'BALCAO' ? 'Balcão' : 'Cliente Delivery')),
        tableNumber: order.table?.number,
        tableId: order.tableId,
        totalAmountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmountNum),
        totalAmountCents: Math.round(totalAmountNum * 100),
        createdAt: order.createdAt,
        slaMinutes,
        elapsedMinutes,
        isDelayed: elapsedMinutes >= slaMinutes,
        notes: order.notes,
        items: order.items.map(item => ({
          id: item.id,
          productName: item.product?.name || 'Produto',
          quantity: item.quantity,
          notes: item.notes,
          modifiers: (item.modifiers || []).map(m => ({ id: m.id, name: m.name, quantity: 1 })),
          assemblies: (item.assemblies || []).map(a => ({ id: a.id, name: a.name, quantity: 1 })),
          complements: (item.complements || []).map(c => ({ id: c.id, name: c.name, quantity: c.quantity || 1 }))
        }))
      };
    });

    return json({
      success: true,
      orders
    });
  } catch (err: any) {
    console.error('[API KDS Error]', err);
    return json({ success: false, error: `Erro ao buscar pedidos do KDS: ${err.message}` }, { status: 500 });
  }
};
