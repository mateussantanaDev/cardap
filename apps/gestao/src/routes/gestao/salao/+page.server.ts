import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';
import { QrTableToken } from '@cardap/core';

export const load: PageServerLoad = async ({ locals }) => {
  let tables: any[] = [];
  let restaurant: any = null;
  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';
  const vitrineBase = process.env.PUBLIC_VITRINE_URL || 'https://usecardap.com.br';

  try {
    const isSuperAdmin = locals.user?.role === 'ADMIN' && !locals.user?.restaurantId;
    const targetRestId = locals.user?.restaurantId;

    const dbRest = await prisma.restaurant.findFirst({
      where: targetRestId ? { id: targetRestId } : undefined
    });

    if (dbRest) {
      restaurant = {
        id: dbRest.id,
        name: dbRest.name,
        slug: dbRest.slug,
        logoUrl: dbRest.logoUrl || '',
        primaryColor: dbRest.primaryColor || '#dc2626'
      };
    }

    const rawTables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: {
            status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
          },
          include: {
            items: {
              include: {
                product: {
                  select: { name: true, price: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    tables = rawTables.map(t => {
      const activeTotal = t.orders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
      const activeOrdersCount = t.orders.length;

      const realItems: Array<{ name: string; qty: number; priceFormatted: string; notes?: string }> = [];
      for (const order of t.orders) {
        for (const it of order.items) {
          realItems.push({
            name: it.product?.name || 'Item do Pedido',
            qty: it.quantity,
            priceFormatted: `R$ ${(Number(it.unitPrice) * it.quantity).toFixed(2).replace('.', ',')}`,
            notes: it.notes || undefined
          });
        }
      }

      const tokenObj = QrTableToken.create(t.id, t.number, secretKey);
      const rawToken = tokenObj.getRawToken();
      const qrUrl = `${vitrineBase}/mesa/${rawToken}`;

      let currentStatus = t.status;
      if (activeOrdersCount > 0 && currentStatus === 'LIVRE') {
        currentStatus = 'OCUPADA';
      }

      return {
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        status: currentStatus,
        activeOrdersCount,
        activeOrderNumber: t.orders[0]?.orderNumber ? `#${t.orders[0].orderNumber}` : null,
        activeOrderTotalCents: Math.round(activeTotal * 100),
        activeOrderTotalFormatted: `R$ ${activeTotal.toFixed(2).replace('.', ',')}`,
        signedQrToken: rawToken,
        qrCodeUrl: qrUrl,
        items: realItems
      };
    });
  } catch (err) {
    console.warn('Erro ao carregar mesas no SSR:', err);
  }

  return {
    tables,
    restaurant: restaurant || {
      name: 'Cardap Food',
      slug: 'cardap',
      logoUrl: '',
      primaryColor: '#dc2626'
    }
  };
};
