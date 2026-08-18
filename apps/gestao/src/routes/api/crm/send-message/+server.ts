import { json, type RequestHandler } from '@sveltejs/kit';
import { SendOrderWhatsAppNotificationUseCase } from '@cardap/core';
import { PrismaOrderRepository, PrismaCustomerRepository } from '@cardap/database';

const orderRepo = new PrismaOrderRepository();
const customerRepo = new PrismaCustomerRepository();
const sendUseCase = new SendOrderWhatsAppNotificationUseCase(orderRepo, customerRepo);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return json({ success: false, error: 'Informe o orderId para disparo da mensagem de WhatsApp.' }, { status: 400 });
    }

    const result = await sendUseCase.execute({ orderId });
    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      notification: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao enviar notificação de WhatsApp: ${err.message}` }, { status: 500 });
  }
};
