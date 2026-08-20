import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ locals }) => {
  // Apenas o SuperAdmin (Admin sem restaurantId) pode acessar o painel SaaS
  if (!locals.user || locals.user.role !== 'ADMIN' || locals.user.restaurantId) {
    throw redirect(303, '/gestao');
  }

  let tenants: any[] = [];

  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { id: true, name: true, phone: true, email: true },
          take: 1
        }
      }
    });

    tenants = restaurants.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category || 'Restaurante / Lanchonete',
      cnpj: r.cnpj || '',
      ownerName: r.users[0]?.name || 'Proprietário',
      ownerPhone: r.phone || r.users[0]?.phone || '',
      email: r.email || r.users[0]?.email || '',
      plan: r.plan as any,
      planPriceCents: r.planPriceCents,
      status: r.status as any,
      vitrineUrl: `https://usecardap.com.br/${r.slug}`,
      createdAt: r.createdAt.toLocaleDateString('pt-BR'),
      totalOrdersMonth: 0,
      gmvMonthCents: 0
    }));
  } catch (err) {
    console.warn('Erro ao carregar tenants no SSR:', err);
  }

  return {
    tenants
  };
};
