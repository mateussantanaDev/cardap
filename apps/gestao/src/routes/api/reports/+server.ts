import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async () => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
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
      const total = Number(o.totalAmount);
      totalGmv += total;

      if (o.type === 'DELIVERY') deliveryCount++;
      else if (o.type === 'SALAO') salaoCount++;
      else balcaoCount++;

      for (const item of o.items) {
        const prodName = item.product.name;
        if (!productSalesMap[prodName]) {
          productSalesMap[prodName] = { name: prodName, quantity: 0, revenue: 0 };
        }
        productSalesMap[prodName].quantity += item.quantity;
        productSalesMap[prodName].revenue += Number(item.totalPrice);
      }

      return {
        id: `#ord-${o.orderNumber}`,
        orderId: o.id,
        date: o.createdAt.toLocaleDateString('pt-BR') + ' ' + o.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        channel: o.type === 'SALAO' ? `Salão (Mesa ${o.table?.number || '?'})` : o.type === 'DELIVERY' ? 'Delivery Próprio' : 'Balcão Retirada',
        payment: o.paymentMethod.replace('_', ' '),
        totalFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total),
        status: o.status
      };
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
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
