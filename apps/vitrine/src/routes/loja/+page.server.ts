import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ url }) => {
  const querySlug = url.searchParams.get('slug');

  let restaurant: any = null;

  try {
    const dbRest = querySlug
      ? await prisma.restaurant.findUnique({ where: { slug: querySlug } })
      : await prisma.restaurant.findFirst();

    if (dbRest) {
      restaurant = {
        slug: dbRest.slug,
        name: dbRest.name,
        category: dbRest.category,
        rating: '5.0 ★ (2.4k avaliações)',
        operatingHours: dbRest.operatingHours || 'Seg a Dom: 16:00 às 23:30',
        slaText: `${dbRest.slaMinutesMin}-${dbRest.slaMinutesMax} min`,
        deliveryFeeText: `R$ ${Number(dbRest.deliveryFee).toFixed(2).replace('.', ',')}`,
        deliveryFeeCents: Math.round(Number(dbRest.deliveryFee) * 100),
        minOrderText: `R$ ${Number(dbRest.minOrderValue).toFixed(2).replace('.', ',')}`,
        minOrderCents: Math.round(Number(dbRest.minOrderValue) * 100),
        phone: dbRest.phone || '(87) 9 9603-6770',
        email: dbRest.email || 'contato@cardaperp.com.br',
        cnpj: dbRest.cnpj || '52.894.103/0001-88',
        instagram: dbRest.instagram || '',
        addressStreet: dbRest.addressStreet || 'Av. Rui Barbosa',
        addressNumber: dbRest.addressNumber || '450',
        addressNeighborhood: dbRest.addressNeighborhood || 'Centro',
        addressCity: dbRest.addressCity || 'Garanhuns',
        addressState: dbRest.addressState || 'PE',
        addressZipCode: dbRest.addressZipCode || '55295-000',
        address: `${dbRest.addressStreet || 'Av. Principal'}, ${dbRest.addressNumber || 'S/N'} — ${dbRest.addressNeighborhood || 'Centro'}, ${dbRest.addressCity || 'Garanhuns'}/${dbRest.addressState || 'PE'}`,
        isOpen: dbRest.isOpen,
        allowDelivery: dbRest.allowDelivery,
        allowTakeout: dbRest.allowTakeout,
        allowDineIn: dbRest.allowDineIn,
        logoUrl: dbRest.logoUrl || '',
        bannerUrl: dbRest.bannerUrl || '',
        primaryColor: dbRest.primaryColor || '#dc2626',
        secondaryColor: dbRest.secondaryColor || '#0f172a',
        accentColor: dbRest.accentColor || '#f59e0b',
        paymentGateway: dbRest.paymentGateway || 'MERCADO_PAGO'
      };
    }
  } catch (e) {
    console.error('Erro ao carregar loja no SSR:', e);
  }

  return {
    restaurant
  };
};
