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
      rating: '5.0 ★ (2.4k avaliações)',
      slaText: `${r.slaMinutesMin}-${r.slaMinutesMax} min`,
      deliveryFeeText: `R$ ${Number(r.deliveryFee).toFixed(2).replace('.', ',')}`,
      isOpen: r.isOpen
    }));
  } catch {}

  if (restaurants.length === 0) {
    restaurants = [
      {
        slug: 'imperius-do-pastel',
        name: 'IMPERIUS DO PASTEL',
        category: 'Pastelaria Artesanal & Caldos de Cana · Garanhuns',
        rating: '5.0 ★ (2.4k avaliações)',
        slaText: '20-40 min',
        deliveryFeeText: 'R$ 6,00',
        isOpen: true
      }
    ];
  }

  return { restaurants };
};
