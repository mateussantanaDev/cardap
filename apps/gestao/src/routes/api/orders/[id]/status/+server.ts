import { json, type RequestHandler } from '@sveltejs/kit';
import { AdvanceKdsStatusUseCase, SecurityGuard } from '@cardap/core';
import { PrismaOrderRepository } from '@cardap/database';
import { realtimeBus } from '@cardap/realtime';

const orderRepo = new PrismaOrderRepository();
const advanceUseCase = new AdvanceKdsStatusUseCase(orderRepo);

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const authCheck = SecurityGuard.authorize(locals.user.role, 'ADVANCE_KDS_STATUS');
  if (authCheck.isFailure) {
    return json({ success: false, error: authCheck.getError().message }, { status: 403 });
  }

  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const nextStatus = body.status;

    if (!nextStatus) {
      return json({ success: false, error: 'Informe o novo status do pedido.' }, { status: 400 });
    }

    const result = await advanceUseCase.execute({
      orderId,
      nextStatus
    });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    const updatedOrder = result.getValue();
    realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', updatedOrder);

    return json({
      success: true,
      order: updatedOrder
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao atualizar status do pedido: ${err.message}` }, { status: 500 });
  }
};
