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
        customer: true,
        table: { select: { number: true } },
        shift: {
          include: {
            restaurant: true
          }
        },
        items: {
          include: {
            product: { select: { name: true, price: true } },
            assemblies: true,
            modifiers: true,
            complements: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const now = Date.now();

    orders = rawOrders.map((o: any) => {
      const rest = o.shift?.restaurant;
      const subtotalNum = Number(o.subtotal || 0);
      const deliveryFeeNum = Number(o.deliveryFee || 0);
      const discountNum = Number(o.discountAmount || 0);
      const totalNum = Number(o.totalAmount || 0);

      const createdTime = new Date(o.createdAt).getTime();
      const elapsedMinutes = Math.floor((now - createdTime) / (1000 * 60));
      const slaMinutes = o.type === 'DELIVERY' ? 25 : 15;

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
        slaMinutes,
        elapsedMinutes,
        isDelayed: elapsedMinutes >= slaMinutes,
        notes: o.notes || '',
        subtotalFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalNum),
        deliveryFeeFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFeeNum),
        discountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountNum),
        totalAmountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalNum),
        totalAmountCents: Math.round(totalNum * 100),
        restaurantName: rest?.name || 'Imperius do Pastel',
        restaurantPhone: rest?.phone || '(87) 9 9603-6770',
        restaurantCnpj: rest?.cnpj || '',
        restaurantAddress: rest ? [rest.addressStreet, rest.addressNumber, rest.addressNeighborhood, rest.addressCity].filter(Boolean).join(', ') : '',
        deliveryAddress: o.customer ? {
          street: o.customer.addressStreet,
          number: o.customer.addressNumber,
          complement: o.customer.addressComplement,
          neighborhood: o.customer.addressNeighborhood,
          city: o.customer.addressCity,
          state: o.customer.addressState,
          zipCode: o.customer.addressZipCode
        } : undefined,
        items: o.items.map((i: any) => {
          const itemUnitNum = Number(i.unitPrice || i.product?.price || 0);
          const itemTotalNum = Number(i.totalPrice || (itemUnitNum * i.quantity));
          return {
            id: i.id || i.productId,
            productName: i.product?.name || i.productName || 'Produto',
            quantity: i.quantity,
            unitPriceFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemUnitNum),
            totalPriceFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotalNum),
            notes: i.notes || '',
            assemblies: (i.assemblies || []).map((a: any) => ({ id: a.id, name: a.name, quantity: 1 })),
            modifiers: (i.modifiers || []).map((m: any) => ({ id: m.id, name: m.name, quantity: 1 })),
            complements: (i.complements || []).map((c: any) => ({ id: c.id, name: c.name, quantity: c.quantity || 1 }))
          };
        })
      };
    });
  } catch (err) {
    console.warn('Erro ao carregar KDS no SSR via Prisma direct:', err);
  }

  return {
    orders
  };
};
