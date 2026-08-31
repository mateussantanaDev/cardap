import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

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
            sector: (it.product?.name || '').toLowerCase().includes('coca') ||
                    (it.product?.name || '').toLowerCase().includes('suco') ||
                    (it.product?.name || '').toLowerCase().includes('cerveja') ||
                    (it.product?.name || '').toLowerCase().includes('água') ||
                    (it.product?.name || '').toLowerCase().includes('agua') ||
                    (it.product?.name || '').toLowerCase().includes('bebida')
                    ? 'BEBIDA' : 'COZINHA'
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

    // 2. Carregar catálogo de produtos para o garçom lançar pedidos
    const dbCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            modifierOptions: true,
            complementOptions: true,
            assemblyOptions: true
          }
        }
      }
    });

    categories = dbCategories
      .filter(c => c.products.length > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        products: c.products.map(p => {
          const pName = p.name;
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
            code: p.code,
            name: p.name,
            description: p.description || '',
            price: Number(p.price || 0),
            priceFormatted: `R$ ${Number(p.price || 0).toFixed(2).replace('.', ',')}`,
            imageUrl: p.imageUrl || '',
            isAssembly: p.isAssembly,
            destinationSector: isDrink ? 'BEBIDA_BALCAO' : 'COZINHA',
            modifierOptions: p.modifierOptions || [],
            complementOptions: p.complementOptions || [],
            assemblyOptions: p.assemblyOptions || []
          };
        })
      }));
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
