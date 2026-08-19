import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ locals }) => {
  let tenants: any[] = [];

  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const vitrineBase = process.env.PUBLIC_VITRINE_URL || 'https://cardcap.vercel.app';
    tenants = restaurants.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: 'Pastelaria Artesanal',
      cnpj: '12.345.678/0001-90',
      ownerName: 'Mateus Vieira',
      ownerPhone: r.phone || '(87) 99999-9999',
      plan: 'ENTERPRISE',
      planPriceCents: 29900,
      status: 'ATIVO',
      vitrineUrl: `${vitrineBase}/${r.slug}`,
      createdAt: r.createdAt.toLocaleDateString('pt-BR'),
      totalOrdersMonth: 142,
      gmvMonthCents: 485000
    }));
  } catch (err) {
    console.warn('Erro ao carregar tenants no SSR:', err);
  }

  return {
    tenants
  };
};
