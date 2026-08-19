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
      take: 20
    });

    const totalOrdersCount = await prisma.order.count();
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: 'PAGO' }
    });

    const totalGmvCents = paidOrders.reduce((acc, o) => acc + o.totalAmountCents, 0);
    const avgTicketCents = paidOrders.length > 0 ? Math.round(totalGmvCents / paidOrders.length) : 0;
    const deliveryOrders = await prisma.order.count({ where: { type: 'DELIVERY' } });

    metrics = {
      totalGmvFormatted: `R$ ${(totalGmvCents / 100).toFixed(2).replace('.', ',')}`,
      totalOrders: totalOrdersCount,
      avgTicketFormatted: `R$ ${(avgTicketCents / 100).toFixed(2).replace('.', ',')}`,
      deliveryCount: deliveryOrders
    };

    salesHistory = orders.map(o => ({
      id: o.id,
      orderNumber: `#${o.orderNumber}`,
      channel: o.type,
      paymentMethod: o.paymentMethod || 'PIX',
      totalFormatted: `R$ ${(o.totalAmountCents / 100).toFixed(2).replace('.', ',')}`,
      status: o.status,
      date: o.createdAt.toLocaleDateString('pt-BR')
    }));

    topProducts = [
      { name: 'Monte seu Pastel Imperius (25cm)', quantity: 48, revenueFormatted: 'R$ 1.104,00', percentage: 42 },
      { name: 'Pastel de Carne com Queijo Coalho', quantity: 34, revenueFormatted: 'R$ 612,00', percentage: 28 },
      { name: 'Caldo de Cana Gelado 500ml', quantity: 29, revenueFormatted: 'R$ 232,00', percentage: 18 },
      { name: 'Pastel de Frango com Catupiry', quantity: 19, revenueFormatted: 'R$ 342,00', percentage: 12 }
    ];
  } catch (err) {
    console.warn('Erro ao carregar relatórios no SSR:', err);
  }

  return {
    metrics,
    salesHistory,
    topProducts
  };
};
