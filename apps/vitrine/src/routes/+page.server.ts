import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async () => {
  let restaurants: any[] = [];
  try {
    const dbRestaurants = await prisma.restaurant.findMany({
      where: { status: 'ATIVO' },
      orderBy: { name: 'asc' }
    });

    restaurants = dbRestaurants.map(r => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      rating: '5.0 ★',
      slaText: `${r.slaMinutesMin}-${r.slaMinutesMax} min`,
      deliveryFeeText: `R$ ${Number(r.deliveryFee).toFixed(2).replace('.', ',')}`,
      isOpen: r.isOpen
    }));
  } catch (err) {
    console.error('Erro ao listar restaurantes na vitrine:', err);
  }

  return { restaurants };
};
