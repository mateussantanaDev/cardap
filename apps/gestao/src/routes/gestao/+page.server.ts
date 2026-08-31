import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ locals }) => {
  let orders: any[] = [];
  let totalRevenueCents = 0;
  let paidCount = 0;
  let openCount = 0;
  let kitchenCount = 0;

  try {
    const restaurant = locals.user?.restaurantId
      ? await prisma.restaurant.findUnique({ where: { id: locals.user.restaurantId } })
      : await prisma.restaurant.findFirst();

    // Início do dia de hoje (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dbOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      include: {
        customer: true,
        table: { select: { number: true } },
        items: {
          include: {
            product: { select: { name: true, price: true } },
            assemblies: true,
            modifiers: true,
            complements: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    orders = dbOrders.map(o => {
      const subtotalNum = Number(o.subtotal || 0);
      const deliveryFeeNum = Number(o.deliveryFee || 0);
      const discountNum = Number(o.discountAmount || 0);
      const totalNum = Number(o.totalAmount || 0);
      const totalCents = Math.round(totalNum * 100);

      const isPaidOrClosed = o.status === 'ENTREGUE' || o.paymentStatus === 'PAGO';
      if (isPaidOrClosed) {
        totalRevenueCents += totalCents;
        paidCount++;
      }

      if (o.status !== 'ENTREGUE' && o.status !== 'CANCELADO') {
        openCount++;
      }

      if (o.status === 'RECEBIDO' || o.status === 'EM_PREPARO') {
        kitchenCount++;
      }

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        type: o.type,
        status: o.status,
        paymentMethod: o.paymentMethod || 'BALCAO',
        paymentStatus: o.paymentStatus || 'PAGO',
        customerName: o.customer?.name || (o.type === 'SALAO' && o.table?.number ? `Mesa ${o.table.number}` : (o.type === 'BALCAO' ? 'Balcão' : 'Cliente Delivery')),
        customerPhone: o.customer?.phone || '',
        customerCpf: o.customer?.cpf || '',
        deliveryAddress: o.customer ? {
          street: o.customer.addressStreet,
          number: o.customer.addressNumber,
          complement: o.customer.addressComplement,
          neighborhood: o.customer.addressNeighborhood,
          city: o.customer.addressCity,
          state: o.customer.addressState,
          zipCode: o.customer.addressZipCode
        } : undefined,
        tableNumber: o.table?.number || undefined,
        tableId: o.tableId,
        createdAt: o.createdAt.toISOString(),
        notes: o.notes || '',
        subtotalFormatted: fmt(subtotalNum),
        deliveryFeeFormatted: fmt(deliveryFeeNum),
        discountFormatted: fmt(discountNum),
        totalAmountFormatted: fmt(totalNum),
        totalAmountCents: totalCents,
        items: o.items.map(i => ({
          id: i.id,
          productName: i.product?.name || 'Produto',
          quantity: i.quantity,
          unitPriceFormatted: fmt(Number(i.unitPrice || i.product?.price || 0)),
          totalPriceFormatted: fmt(Number(i.totalPrice || 0)),
          notes: i.notes || '',
          assemblies: (i.assemblies || []).map(a => ({ id: a.id, name: a.name })),
          modifiers: (i.modifiers || []).map(m => ({ id: m.id, name: m.name })),
          complements: (i.complements || []).map(c => ({ id: c.id, name: c.name }))
        }))
      };
    });
  } catch (e) {
    console.warn('Erro ao carregar métricas da visão geral:', e);
  }

  return {
    orders,
    initialMetrics: {
      totalRevenueCents,
      paidCount,
      openCount,
      kitchenCount,
      averageTicketCents: paidCount > 0 ? Math.round(totalRevenueCents / paidCount) : 0
    }
  };
};
