import { json, type RequestHandler } from '@sveltejs/kit';
import { CancelOrderUseCase, SecurityGuard } from '@cardap/core';
import { PrismaOrderRepository, PrismaTableRepository } from '@cardap/database';

const orderRepo = new PrismaOrderRepository();
const tableRepo = new PrismaTableRepository();
const cancelUseCase = new CancelOrderUseCase(orderRepo, tableRepo);

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const authCheck = SecurityGuard.authorize(locals.user.role, 'CANCEL_ORDER');
  if (authCheck.isFailure) {
    return json({ success: false, error: authCheck.getError().message }, { status: 403 });
  }

  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const reason = body.reason ? SecurityGuard.sanitizeString(body.reason) : '';

    if (!reason || reason.length < 3) {
      return json({ success: false, error: 'É obrigatório informar um motivo válido para o cancelamento.' }, { status: 400 });
    }

    const result = await cancelUseCase.execute({
      orderId,
      reason
    });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      order: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao cancelar pedido: ${err.message}` }, { status: 500 });
  }
};
