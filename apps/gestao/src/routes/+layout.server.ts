import type { LayoutServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: LayoutServerLoad = async ({ locals }) => {
  let restaurants: any[] = [];
  const isSuperAdmin = locals.user?.role === 'ADMIN' && !locals.user?.restaurantId;

  if (locals.user) {
    try {
      const dbRestaurants = await prisma.restaurant.findMany({
        where: isSuperAdmin ? undefined : { id: locals.user.restaurantId || '__NONE__' },
        orderBy: { name: 'asc' }
      });

      restaurants = dbRestaurants.map(r => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        category: r.category,
        cnpj: r.cnpj || '',
        ownerName: 'Proprietário',
        ownerPhone: r.phone || '',
        plan: r.plan as any,
        planPriceCents: r.planPriceCents,
        status: r.status as any,
        vitrineUrl: `https://usecardap.com.br/${r.slug}`,
        createdAt: r.createdAt.toLocaleDateString('pt-BR'),
        totalOrdersMonth: 0,
        gmvMonthCents: 0
      }));
    } catch (err) {
      console.warn('Erro ao listar estabelecimentos no layout:', err);
    }
  }

  return {
    user: locals.user,
    isSuperAdmin,
    restaurants
  };
};
