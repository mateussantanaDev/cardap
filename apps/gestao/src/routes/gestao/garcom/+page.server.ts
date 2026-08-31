import type { PageServerLoad } from './$types';
import { prisma, PrismaCatalogRepository } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let tables: any[] = [];
  let categories: any[] = [];
  let restaurant: any = null;

  try {
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
        primaryColor: dbRest.primaryColor || '#dc2626',
        phone: dbRest.phone || ''
      };
    }

    // 1. Carregar mesas com pedidos ativos e itens
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
                  select: { name: true, price: true, categoryId: true }
                },
                assemblies: true,
                modifiers: true,
                complements: true
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

      const realItems: Array<{
        id?: string;
        orderId?: string;
        orderNumber?: number;
        name: string;
        qty: number;
        unitPriceFormatted: string;
        priceFormatted: string;
        notes?: string;
        status?: string;
        sector?: string;
      }> = [];

      for (const order of t.orders) {
        for (const it of order.items) {
          const itemPrice = Number(it.unitPrice || it.product?.price || 0);
          const totalItemPrice = itemPrice * it.quantity;
          const pName = (it.product?.name || '').toLowerCase();
          const isDrink =
            pName.includes('coca') ||
            pName.includes('suco') ||
            pName.includes('cerveja') ||
            pName.includes('água') ||
            pName.includes('agua') ||
            pName.includes('bebida') ||
            pName.includes('refrigerante');

          realItems.push({
            id: it.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            name: it.product?.name || 'Item do Pedido',
            qty: it.quantity,
            unitPriceFormatted: `R$ ${itemPrice.toFixed(2).replace('.', ',')}`,
            priceFormatted: `R$ ${totalItemPrice.toFixed(2).replace('.', ',')}`,
            notes: it.notes || undefined,
            status: order.status,
            sector: isDrink ? 'BEBIDA' : 'COZINHA'
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
        items: realItems,
        orders: t.orders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: Number(o.totalAmount),
          totalAmountFormatted: `R$ ${Number(o.totalAmount).toFixed(2).replace('.', ',')}`,
          createdAt: o.createdAt
        }))
      };
    });

    // 2. Carregar catálogo oficial de categorias e produtos
    const rawCategories = await catalogRepo.findActiveCategoriesWithProducts('B2B');

    categories = rawCategories
      .filter((c: any) => (c.products || []).length > 0)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        products: (c.products || []).map((p: any) => {
          const pName = p.name || '';
          const numPrice = p.priceCents !== undefined ? Number(p.priceCents) / 100 : Number(p.price || 0);
          const isDrink =
            pName.toLowerCase().includes('coca') ||
            pName.toLowerCase().includes('suco') ||
            pName.toLowerCase().includes('cerveja') ||
            pName.toLowerCase().includes('água') ||
            pName.toLowerCase().includes('agua') ||
            pName.toLowerCase().includes('bebida') ||
            pName.toLowerCase().includes('refrigerante') ||
            c.name.toLowerCase().includes('bebida');

          return {
            id: p.id,
            code: p.code || 'PROD',
            name: pName,
            description: p.description || '',
            price: numPrice,
            priceFormatted: `R$ ${numPrice.toFixed(2).replace('.', ',')}`,
            imageUrl: p.imageUrl || '',
            isAssembly: Boolean(p.isAssembly),
            destinationSector: isDrink ? 'BEBIDA_BALCAO' : 'COZINHA',
            categoryName: c.name
          };
        })
      }));

    // Fallback: Se categories estiver vazio, busca produtos diretamente
    if (categories.length === 0) {
      const allDbProducts = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { name: 'asc' }
      });

      if (allDbProducts.length > 0) {
        const catMap = new Map<string, any[]>();
        for (const p of allDbProducts) {
          const catName = p.category?.name || 'Cardápio Geral';
          if (!catMap.has(catName)) {
            catMap.set(catName, []);
          }
          const numPrice = Number(p.price || 0);
          const pName = p.name;
          const isDrink =
            pName.toLowerCase().includes('coca') ||
            pName.toLowerCase().includes('suco') ||
            pName.toLowerCase().includes('cerveja') ||
            pName.toLowerCase().includes('água') ||
            pName.toLowerCase().includes('agua') ||
            pName.toLowerCase().includes('bebida') ||
            pName.toLowerCase().includes('refrigerante') ||
            catName.toLowerCase().includes('bebida');

          catMap.get(catName)!.push({
            id: p.id,
            code: p.code || 'PROD',
            name: pName,
            description: p.description || '',
            price: numPrice,
            priceFormatted: `R$ ${numPrice.toFixed(2).replace('.', ',')}`,
            imageUrl: p.imageUrl || '',
            isAssembly: Boolean(p.isAssembly),
            destinationSector: isDrink ? 'BEBIDA_BALCAO' : 'COZINHA',
            categoryName: catName
          });
        }

        categories = Array.from(catMap.entries()).map(([name, prods]) => ({
          id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          products: prods
        }));
      }
    }
  } catch (err: any) {
    console.error('Erro ao carregar dados do app do garçom:', err);
  }

  return {
    tables,
    categories,
    user: locals.user,
    restaurant: restaurant || {
      name: 'Cardap Food',
      slug: 'cardap',
      logoUrl: '',
      primaryColor: '#dc2626'
    }
  };
};
