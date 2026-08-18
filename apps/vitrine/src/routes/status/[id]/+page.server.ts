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
        items: {
          include: {
            assemblies: true
          }
        },
        table: true
      }
    });

    if (dbOrder) {
      order = {
        id: dbOrder.id,
        orderNumber: dbOrder.orderNumber,
        status: dbOrder.status,
        type: dbOrder.type,
        customerName: dbOrder.customerName || 'Cliente',
        customerPhone: dbOrder.customerPhone || '',
        tableNumber: dbOrder.table?.number || undefined,
        totalCents: dbOrder.totalAmountCents,
        deliveryFeeCents: dbOrder.deliveryFeeCents,
        discountCents: dbOrder.discountCents,
        notes: dbOrder.notes,
        createdAt: dbOrder.createdAt.toISOString(),
        items: dbOrder.items.map(it => ({
          name: it.productName,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          totalPriceCents: it.totalPriceCents,
          notes: it.notes,
          assemblies: it.assemblies.map(a => a.name)
        }))
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
