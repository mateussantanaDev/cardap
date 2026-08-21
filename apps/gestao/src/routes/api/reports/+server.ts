import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ url }) => {
  const period = url.searchParams.get('period') || 'MES';
  const customStart = url.searchParams.get('startDate');
  const customEnd = url.searchParams.get('endDate');

  try {
    let dateFilter: any = {};
    const now = new Date();

    if (period === 'HOJE') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      dateFilter = { createdAt: { gte: startOfDay } };
    } else if (period === 'SEMANA') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { gte: startOfWeek } };
    } else if (period === 'MES') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      dateFilter = { createdAt: { gte: startOfMonth } };
    } else if (customStart && customEnd) {
      dateFilter = {
        createdAt: {
          gte: new Date(customStart),
          lte: new Date(customEnd + 'T23:59:59')
        }
      };
    }

    const orders = await prisma.order.findMany({
      where: dateFilter,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: {
          include: {
            product: true
          }
        },
        payments: true,
        table: true,
        customer: true
      }
    });

    let totalGmv = 0;
    let totalOrders = orders.length;
    let deliveryCount = 0;
    let salaoCount = 0;
    let balcaoCount = 0;
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    const formattedHistory = orders.map(o => {
      const total = Number(o.totalAmount || 0);
      totalGmv += total;

      if (o.type === 'DELIVERY') deliveryCount++;
      else if (o.type === 'SALAO') salaoCount++;
      else balcaoCount++;

      for (const item of o.items) {
        const prodName = item.product?.name || item.productName || 'Produto';
        if (!productSalesMap[prodName]) {
          productSalesMap[prodName] = { name: prodName, quantity: 0, revenue: 0 };
        }
        productSalesMap[prodName].quantity += item.quantity;
        productSalesMap[prodName].revenue += Number(item.totalPrice || 0);
      }

      return {
        id: `#ord-${o.orderNumber}`,
        orderId: o.id,
        date: o.createdAt.toLocaleDateString('pt-BR') + ' ' + o.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        channel: o.type === 'SALAO' ? `Salão (Mesa ${o.table?.number || '?'})` : o.type === 'DELIVERY' ? 'Delivery Próprio' : 'Balcão Retirada',
        payment: (o.paymentMethod || 'PIX').replace('_', ' '),
        totalFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total),
        status: o.status
      };
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        qty: `${p.quantity} unid.`,
        revenueFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.revenue)
      }));

    return json({
      success: true,
      metrics: {
        totalGmvFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGmv),
        totalOrders,
        avgTicketFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrders > 0 ? totalGmv / totalOrders : 0),
        deliveryCount,
        salaoCount,
        balcaoCount
      },
      salesHistory: formattedHistory,
      topProducts
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
