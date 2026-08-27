import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals }) => {
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

    const rawOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO']
        }
      },
      include: {
        customer: true,
        table: { select: { number: true } },
        items: {
          include: {
            product: { select: { name: true, price: true } },
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

      const subtotalNum = Number(order.subtotal || 0);
      const deliveryFeeNum = Number(order.deliveryFee || 0);
      const discountNum = Number(order.discountAmount || 0);
      const totalNum = Number(order.totalAmount || 0);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        status: order.status,
        paymentMethod: order.paymentMethod || 'BALCAO',
        paymentStatus: order.paymentStatus || 'PAGO',
        customerName: order.customer?.name || (order.type === 'SALAO' && order.table?.number ? `Mesa ${order.table.number}` : (order.type === 'BALCAO' ? 'Balcão' : 'Cliente Delivery')),
        customerPhone: order.customer?.phone || '',
        customerCpf: order.customer?.cpf || '',
        deliveryAddress: order.customer ? {
          street: order.customer.addressStreet,
          number: order.customer.addressNumber,
          complement: order.customer.addressComplement,
          neighborhood: order.customer.addressNeighborhood,
          city: order.customer.addressCity,
          state: order.customer.addressState,
          zipCode: order.customer.addressZipCode
        } : undefined,
        restaurantName: restaurant?.name || 'Estabelecimento',
        restaurantPhone: restaurant?.phone || '',
        restaurantCnpj: restaurant?.cnpj || '',
        restaurantAddress: restAddress,
        tableNumber: order.table?.number,
        tableId: order.tableId,
        subtotalFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalNum),
        deliveryFeeFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFeeNum),
        discountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountNum),
        totalAmountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalNum),
        totalAmountCents: Math.round(totalNum * 100),
        createdAt: order.createdAt.toISOString(),
        slaMinutes,
        elapsedMinutes,
        isDelayed: elapsedMinutes >= slaMinutes,
        notes: order.notes || '',
        items: order.items.map(item => {
          const itemUnitNum = Number(item.unitPrice || item.product?.price || 0);
          const itemTotalNum = Number(item.totalPrice || (itemUnitNum * item.quantity));
          return {
            id: item.id,
            productName: item.product?.name || 'Produto',
            quantity: item.quantity,
            unitPriceFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemUnitNum),
            totalPriceFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotalNum),
            notes: item.notes || '',
            modifiers: (item.modifiers || []).map(m => ({ id: m.id, name: m.name, quantity: 1 })),
            assemblies: (item.assemblies || []).map(a => ({ id: a.id, name: a.name, quantity: 1 })),
            complements: (item.complements || []).map(c => ({ id: c.id, name: c.name, quantity: c.quantity || 1 }))
          };
        })
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
