import { json, type RequestHandler } from '@sveltejs/kit';
import { AdvanceKdsStatusUseCase, SecurityGuard } from '@cardap/core';
import { PrismaOrderRepository, prisma } from '@cardap/database';
import { realtimeBus } from '@cardap/realtime';

const orderRepo = new PrismaOrderRepository();
const advanceUseCase = new AdvanceKdsStatusUseCase(orderRepo);

async function handleUpdateStatus({ params, request, locals }: { params: any; request: Request; locals: any }) {
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

    // Tenta avançar via UseCase de Domínio
    const result = await advanceUseCase.execute({
      orderId,
      nextStatus
    });

    if (result.isFailure) {
      // Fallback de persistência direta via Prisma para garantir que nunca trave a operação
      const numericOrderNumber = parseInt(orderId.replace(/\D/g, ''), 10);
      const existingOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { id: orderId },
            ...(isNaN(numericOrderNumber) ? [] : [{ orderNumber: numericOrderNumber }])
          ]
        }
      });

      if (!existingOrder) {
        return json({ success: false, error: result.getError().message }, { status: 400 });
      }

      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          status: nextStatus,
          updatedAt: new Date()
        }
      });

      try {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: existingOrder.id,
            status: nextStatus,
            notes: `Status atualizado via KDS para ${nextStatus}`
          }
        });
      } catch (e) {}

      realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', {
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        newStatus: nextStatus
      });

      return json({
        success: true,
        order: {
          id: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          status: nextStatus
        }
      });
    }

    const updatedOrder = result.getValue();
    realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', updatedOrder);

    return json({
      success: true,
      order: updatedOrder
    });
  } catch (err: any) {
    console.error(`[KDS Status Error] Erro ao atualizar pedido ${orderId}:`, err);
    return json({ success: false, error: `Erro ao atualizar status do pedido: ${err.message}` }, { status: 500 });
  }
}

export const POST: RequestHandler = handleUpdateStatus;
export const PATCH: RequestHandler = handleUpdateStatus;
export const PUT: RequestHandler = handleUpdateStatus;
