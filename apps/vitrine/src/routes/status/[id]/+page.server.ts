import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ params, url }) => {
  const orderId = params.id;
  const querySlug = url.searchParams.get('slug');

  let order: any = null;
  let restaurant: any = null;

  try {
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        table: true,
        items: {
          include: {
            product: { select: { name: true } },
            assemblies: true,
            modifiers: true,
            complements: true
          }
        }
      }
    });

    if (dbOrder) {
      const subtotalCents = Math.round(Number(dbOrder.subtotal || 0) * 100);
      const deliveryFeeCents = Math.round(Number(dbOrder.deliveryFee || 0) * 100);
      const discountCents = Math.round(Number(dbOrder.discountAmount || 0) * 100);
      const totalCents = Math.round(Number(dbOrder.totalAmount || 0) * 100);

      order = {
        id: dbOrder.id,
        orderNumber: dbOrder.orderNumber,
        status: dbOrder.status,
        type: dbOrder.type,
        paymentMethod: dbOrder.paymentMethod,
        paymentStatus: dbOrder.paymentStatus,
        customerName: dbOrder.customer?.name || (dbOrder.type === 'SALAO' ? `Mesa ${dbOrder.table?.number || ''}` : 'Cliente'),
        customerPhone: dbOrder.customer?.phone || '',
        customerCpf: dbOrder.customer?.cpf || '',
        deliveryAddress: dbOrder.customer ? {
          street: dbOrder.customer.addressStreet,
          number: dbOrder.customer.addressNumber,
          complement: dbOrder.customer.addressComplement,
          neighborhood: dbOrder.customer.addressNeighborhood,
          city: dbOrder.customer.addressCity,
          state: dbOrder.customer.addressState,
          zipCode: dbOrder.customer.addressZipCode
        } : undefined,
        tableNumber: dbOrder.table?.number || undefined,
        subtotalCents,
        deliveryFeeCents,
        discountCents,
        totalCents,
        notes: dbOrder.notes,
        createdAt: dbOrder.createdAt.toISOString(),
        items: dbOrder.items.map(it => {
          const unitCents = Math.round(Number(it.unitPrice || 0) * 100);
          const totalItemCents = Math.round(Number(it.totalPrice || (Number(it.unitPrice || 0) * it.quantity)) * 100);
          return {
            name: it.product?.name || 'Item do Pedido',
            quantity: it.quantity,
            unitPriceCents: unitCents,
            totalPriceCents: totalItemCents,
            notes: it.notes,
            assemblies: (it.assemblies || []).map(a => a.name),
            modifiers: (it.modifiers || []).map(m => m.name),
            complements: (it.complements || []).map(c => c.name)
          };
        })
      };
    }
  } catch (e) {
    console.warn('Erro ao carregar pedido no SSR status:', e);
  }

  try {
    const dbRest = querySlug
      ? await prisma.restaurant.findUnique({ where: { slug: querySlug } })
      : await prisma.restaurant.findFirst();

    if (dbRest) {
      restaurant = {
        name: dbRest.name,
        slug: dbRest.slug,
        phone: dbRest.phone || '(87) 9 9603-6770',
        primaryColor: dbRest.primaryColor || '#dc2626',
        secondaryColor: dbRest.secondaryColor || '#0f172a',
        logoUrl: dbRest.logoUrl || ''
      };
    }
  } catch (e) {}

  if (!restaurant) {
    restaurant = {
      name: 'Imperius do Pastel',
      slug: 'imperius-do-pastel',
      phone: '(87) 9 9603-6770',
      primaryColor: '#dc2626',
      secondaryColor: '#0f172a',
      logoUrl: ''
    };
  }

  return {
    orderId,
    order,
    restaurant
  };
};
