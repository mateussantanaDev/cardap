import { json, type RequestHandler } from '@sveltejs/kit';
import { GetKdsOrdersUseCase } from '@cardap/core';
import { PrismaOrderRepository } from '@cardap/database';

const orderRepo = new PrismaOrderRepository();
const kdsUseCase = new GetKdsOrdersUseCase(orderRepo);

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const kdsQueue = await kdsUseCase.execute();

    return json({
      success: true,
      orders: kdsQueue
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao buscar fila do KDS: ${err.message}` }, { status: 500 });
  }
};
