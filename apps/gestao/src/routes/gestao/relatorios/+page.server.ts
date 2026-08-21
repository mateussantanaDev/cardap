import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ locals }) => {
  let metrics = {
    totalGmvFormatted: 'R$ 0,00',
    totalOrders: 0,
    avgTicketFormatted: 'R$ 0,00',
    deliveryCount: 0
  };
  let salesHistory: any[] = [];
  let topProducts: any[] = [];

  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        },
        table: true
      }
    });

    const totalOrdersCount = await prisma.order.count();
    const paidOrders = await prisma.order.findMany({
      where: {
        OR: [
          { paymentStatus: 'PAGO' },
          { status: { in: ['PRONTO', 'ENTREGUE'] } }
        ]
      }
    });

    const totalGmv = paidOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
    const avgTicket = paidOrders.length > 0 ? totalGmv / paidOrders.length : 0;
    const deliveryOrders = await prisma.order.count({ where: { type: 'DELIVERY' } });

    metrics = {
      totalGmvFormatted: `R$ ${totalGmv.toFixed(2).replace('.', ',')}`,
      totalOrders: totalOrdersCount,
      avgTicketFormatted: `R$ ${avgTicket.toFixed(2).replace('.', ',')}`,
      deliveryCount: deliveryOrders
    };

    salesHistory = orders.map(o => ({
      id: o.id,
      orderNumber: `#${o.orderNumber}`,
      channel: o.type === 'SALAO' ? `Mesa ${o.table?.number || ''}` : o.type,
      paymentMethod: o.paymentMethod || 'PIX',
      totalFormatted: `R$ ${(Number(o.totalAmount || 0)).toFixed(2).replace('.', ',')}`,
      status: o.status,
      date: o.createdAt.toLocaleDateString('pt-BR') + ' ' + o.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }));

    // Agrupamento e ranking real dos produtos mais vendidos
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
    let totalItemsSold = 0;

    for (const o of orders) {
      for (const item of o.items) {
        const prodName = item.product?.name || item.productName || 'Produto';
        if (!productStats[prodName]) {
          productStats[prodName] = { name: prodName, quantity: 0, revenue: 0 };
        }
        productStats[prodName].quantity += item.quantity;
        productStats[prodName].revenue += Number(item.totalPrice || 0);
        totalItemsSold += item.quantity;
      }
    }

    topProducts = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6)
      .map(p => ({
        name: p.name,
        quantity: p.quantity,
        revenueFormatted: `R$ ${p.revenue.toFixed(2).replace('.', ',')}`,
        percentage: totalItemsSold > 0 ? Math.round((p.quantity / totalItemsSold) * 100) : 0
      }));
  } catch (err) {
    console.warn('Erro ao carregar relatórios no SSR:', err);
  }

  return {
    metrics,
    salesHistory,
    topProducts
  };
};
