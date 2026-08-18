import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaCustomerRepository } from '@cardap/database';

const customerRepo = new PrismaCustomerRepository();

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const customerId = params.customerId;
  if (!customerId) {
    return json({ success: false, error: 'ID de cliente inválido.' }, { status: 400 });
  }

  try {
    const messages = await customerRepo.getMessagesByCustomerId(customerId);

    return json({
      success: true,
      messages
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao buscar histórico de mensagens: ${err.message}` }, { status: 500 });
  }
};
