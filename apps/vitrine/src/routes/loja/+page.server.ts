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
        phone: dbRest.phone || '(11) 99999-9999',
        email: dbRest.email || 'contato@usecardap.com.br',
        cnpj: dbRest.cnpj || '00.000.000/0001-00',
        instagram: dbRest.instagram || '',
        addressStreet: dbRest.addressStreet || 'Av. Principal',
        addressNumber: dbRest.addressNumber || '100',
        addressNeighborhood: dbRest.addressNeighborhood || 'Centro',
        addressCity: dbRest.addressCity || 'São Paulo',
        addressState: dbRest.addressState || 'SP',
        addressZipCode: dbRest.addressZipCode || '01000-000',
        address: `${dbRest.addressStreet || 'Av. Principal'}, ${dbRest.addressNumber || '100'} — ${dbRest.addressNeighborhood || 'Centro'}, ${dbRest.addressCity || 'São Paulo'}/${dbRest.addressState || 'SP'}`,
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
