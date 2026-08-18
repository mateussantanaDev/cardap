import { json, type RequestHandler } from '@sveltejs/kit';
import { GetCrmCustomerListUseCase } from '@cardap/core';
import { PrismaCustomerRepository } from '@cardap/database';

const customerRepo = new PrismaCustomerRepository();
const listUseCase = new GetCrmCustomerListUseCase(customerRepo);

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const customers = await listUseCase.execute();

    return json({
      success: true,
      customers,
      totalCount: customers.length,
      vipCount: customers.filter(c => c.tags.includes('VIP')).length
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao listar clientes do CRM: ${err.message}` }, { status: 500 });
  }
};
