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
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category || 'Lanches & Refeições',
      rating: '4.9 ★ (1.2k+)',
      slaMin: r.slaMinutesMin || 20,
      slaMax: r.slaMinutesMax || 45,
      slaText: `${r.slaMinutesMin || 20}-${r.slaMinutesMax || 45} min`,
      deliveryFee: Number(r.deliveryFee || 0),
      deliveryFeeText: Number(r.deliveryFee || 0) === 0 ? 'Grátis' : `R$ ${Number(r.deliveryFee).toFixed(2).replace('.', ',')}`,
      minOrderText: `R$ ${Number(r.minOrderValue || 0).toFixed(2).replace('.', ',')}`,
      city: r.addressCity || '',
      neighborhood: r.addressNeighborhood || '',
      street: r.addressStreet || '',
      logoUrl: r.logoUrl || '',
      bannerUrl: r.bannerUrl || '',
      primaryColor: r.primaryColor || '#dc2626',
      isOpen: r.isOpen,
      allowDelivery: r.allowDelivery,
      allowTakeout: r.allowTakeout
    }));
  } catch (err) {
    console.error('Erro ao listar restaurantes na vitrine:', err);
  }

  return { restaurants };
};
