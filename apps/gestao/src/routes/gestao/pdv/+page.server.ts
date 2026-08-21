import type { PageServerLoad } from './$types';
import { prisma, PrismaCatalogRepository } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let products: any[] = [];
  let categories: string[] = ['TODOS'];
  let tables: any[] = [];

  try {
    const rawCategories = await catalogRepo.findActiveCategoriesWithProducts('B2B');
    for (const cat of rawCategories) {
      const catName = cat.name.toUpperCase();
      if (!categories.includes(catName)) {
        categories.push(catName);
      }
      for (const prod of cat.products || []) {
        products.push({
          id: prod.id,
          code: prod.code || 'PROD',
          category: catName,
          name: prod.name,
          priceCents: prod.priceCents !== undefined ? Number(prod.priceCents) : Math.round(Number(prod.price || 0) * 100)
        });
      }
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

      const realItems: Array<{ id: string; productId: string; name: string; priceCents: number; quantity: number; notes?: string }> = [];
      for (const order of t.orders) {
        for (const it of order.items) {
          const itemPriceCents = Math.round(Number(it.unitPrice) * 100);
          realItems.push({
            id: it.id,
            productId: it.productId || it.id,
            name: it.product?.name || 'Item Comanda',
            priceCents: itemPriceCents,
            quantity: it.quantity,
            notes: it.notes || undefined
          });
        }
      }

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
        activeOrderTotalFormatted: `R$ ${activeTotal.toFixed(2).replace('.', ',')}`,
        activeOrderTotalCents: Math.round(activeTotal * 100),
        items: realItems
      };
    });
  } catch (err) {
    console.warn('Erro ao carregar catálogo/mesas no PDV SSR:', err);
  }

  return {
    products,
    categories,
    tables
  };
};
