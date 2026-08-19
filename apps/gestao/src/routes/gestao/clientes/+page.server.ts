import type { PageServerLoad } from './$types';
import { prisma, PrismaCustomerRepository } from '@cardap/database';

const customerRepo = new PrismaCustomerRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let customers: any[] = [];
  let vipCount = 0;

  try {
    const rawCustomers = await customerRepo.findAll();
    vipCount = rawCustomers.filter((c: any) => c.tags && c.tags.includes('VIP')).length;

    customers = rawCustomers.map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address || 'Endereço Principal',
      totalOrdersCount: c.totalOrdersCount || 1,
      totalSpentCents: c.totalSpentCents || 0,
      totalSpentFormatted: `R$ ${((c.totalSpentCents || 0) / 100).toFixed(2).replace('.', ',')}`,
      lastOrderDate: c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('pt-BR') : 'Recente',
      tags: c.tags || ['NOVO']
    }));
  } catch (err) {
    console.warn('Erro ao carregar clientes no SSR:', err);
  }

  return {
    customers,
    vipCount
  };
};
