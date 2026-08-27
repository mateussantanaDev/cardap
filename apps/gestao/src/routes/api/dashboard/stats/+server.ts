import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const restaurant = locals.user.restaurantId
      ? await prisma.restaurant.findUnique({ where: { id: locals.user.restaurantId } })
      : await prisma.restaurant.findFirst();

    const restAddress = restaurant
      ? [restaurant.addressStreet, restaurant.addressNumber, restaurant.addressNeighborhood, restaurant.addressCity, restaurant.addressState].filter(Boolean).join(', ')
      : '';

    // Data de corte: início do dia de hoje (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dbOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: today
        },
        status: {
          not: 'CANCELADO'
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
      orderBy: { createdAt: 'desc' }
    });

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    let totalSalesCents = 0;
    let totalDeliveryFeesCents = 0;
    let totalDiscountsCents = 0;
    let openOrdersCount = 0;
    let kitchenOrdersCount = 0;
    let completedOrdersCount = 0;

    const modalityStats: Record<string, { count: number; totalCents: number }> = {
      SALAO: { count: 0, totalCents: 0 },
      BALCAO: { count: 0, totalCents: 0 },
      DELIVERY: { count: 0, totalCents: 0 }
    };

    const paymentStats: Record<string, { count: number; totalCents: number }> = {
      DINHEIRO: { count: 0, totalCents: 0 },
      PIX: { count: 0, totalCents: 0 },
      CARTAO_CREDITO: { count: 0, totalCents: 0 },
      CARTAO_DEBITO: { count: 0, totalCents: 0 },
      VR_VA: { count: 0, totalCents: 0 }
    };

    const productionMap = new Map<string, { name: string; quantity: number; totalCents: number }>();

    const orders = dbOrders.map(o => {
      const subtotalNum = Number(o.subtotal || 0);
      const deliveryFeeNum = Number(o.deliveryFee || 0);
      const discountNum = Number(o.discountAmount || 0);
      const totalNum = Number(o.totalAmount || 0);
      const totalCents = Math.round(totalNum * 100);

      totalSalesCents += totalCents;
      totalDeliveryFeesCents += Math.round(deliveryFeeNum * 100);
      totalDiscountsCents += Math.round(discountNum * 100);

      if (o.status === 'ENTREGUE' || o.paymentStatus === 'PAGO') {
        completedOrdersCount++;
      } else {
        openOrdersCount++;
      }

      if (o.status === 'RECEBIDO' || o.status === 'EM_PREPARO') {
        kitchenOrdersCount++;
      }

      // Estatísticas por Modalidade
      const mod = o.type || 'BALCAO';
      if (!modalityStats[mod]) modalityStats[mod] = { count: 0, totalCents: 0 };
      modalityStats[mod].count += 1;
      modalityStats[mod].totalCents += totalCents;

      // Estatísticas por Forma de Pagamento
      const pay = o.paymentMethod || 'DINHEIRO';
      if (!paymentStats[pay]) paymentStats[pay] = { count: 0, totalCents: 0 };
      paymentStats[pay].count += 1;
      paymentStats[pay].totalCents += totalCents;

      // Relatório de Produção (Agrupamento de Itens)
      (o.items || []).forEach(it => {
        const prodName = it.product?.name || 'Item';
        const qty = it.quantity || 1;
        const itemUnitCents = Math.round(Number(it.unitPrice || it.product?.price || 0) * 100);
        const itemTotalCents = Math.round(Number(it.totalPrice || 0) * 100) || (itemUnitCents * qty);

        const existing = productionMap.get(prodName);
        if (existing) {
          existing.quantity += qty;
          existing.totalCents += itemTotalCents;
        } else {
          productionMap.set(prodName, {
            name: prodName,
            quantity: qty,
            totalCents: itemTotalCents
          });
        }
      });

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

    const productionItems = Array.from(productionMap.values()).sort((a, b) => b.quantity - a.quantity);
    const totalOrdersCount = dbOrders.length;
    const averageTicketCents = totalOrdersCount > 0 ? Math.round(totalSalesCents / totalOrdersCount) : 0;

    return json({
      success: true,
      stats: {
        totalSalesCents,
        totalSalesFormatted: fmt(totalSalesCents / 100),
        totalDeliveryFeesCents,
        totalDeliveryFeesFormatted: fmt(totalDeliveryFeesCents / 100),
        totalDiscountsCents,
        totalDiscountsFormatted: fmt(totalDiscountsCents / 100),
        totalOrdersCount,
        openOrdersCount,
        kitchenOrdersCount,
        completedOrdersCount,
        averageTicketCents,
        averageTicketFormatted: fmt(averageTicketCents / 100),
        modalities: {
          SALAO: { count: modalityStats.SALAO.count, totalFormatted: fmt(modalityStats.SALAO.totalCents / 100) },
          BALCAO: { count: modalityStats.BALCAO.count, totalFormatted: fmt(modalityStats.BALCAO.totalCents / 100) },
          DELIVERY: { count: modalityStats.DELIVERY.count, totalFormatted: fmt(modalityStats.DELIVERY.totalCents / 100) }
        },
        paymentMethods: {
          DINHEIRO: { count: paymentStats.DINHEIRO.count, totalFormatted: fmt(paymentStats.DINHEIRO.totalCents / 100) },
          PIX: { count: paymentStats.PIX.count, totalFormatted: fmt(paymentStats.PIX.totalCents / 100) },
          CARTAO_CREDITO: { count: paymentStats.CARTAO_CREDITO.count, totalFormatted: fmt(paymentStats.CARTAO_CREDITO.totalCents / 100) },
          CARTAO_DEBITO: { count: paymentStats.CARTAO_DEBITO.count, totalFormatted: fmt(paymentStats.CARTAO_DEBITO.totalCents / 100) },
          VR_VA: { count: paymentStats.VR_VA.count, totalFormatted: fmt(paymentStats.VR_VA.totalCents / 100) }
        },
        productionItems: productionItems.map(p => ({
          ...p,
          totalFormatted: fmt(p.totalCents / 100)
        })),
        restaurant: {
          name: restaurant?.name || 'Estabelecimento',
          phone: restaurant?.phone || '',
          cnpj: restaurant?.cnpj || '',
          address: restAddress
        }
      },
      orders
    });
  } catch (err: any) {
    console.error('[API Dashboard Stats Error]', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
