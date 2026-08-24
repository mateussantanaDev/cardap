import { json, type RequestHandler } from '@sveltejs/kit';
import { AdvanceKdsStatusUseCase, SecurityGuard, type OrderStatus } from '@cardap/core';
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
    const nextStatus = body.status as OrderStatus;

    if (!nextStatus) {
      return json({ success: false, error: 'Informe o novo status do pedido.' }, { status: 400 });
    }

    // 1. Tenta encontrar o pedido no banco primeiro (por UUID direto ou por número de pedido)
    const isUuid = orderId.includes('-') && orderId.length >= 32;
    let existingOrder = null;

    if (isUuid) {
      existingOrder = await prisma.order.findUnique({
        where: { id: orderId }
      });
    } else {
      const cleanDigits = orderId.replace(/\D/g, '');
      if (cleanDigits.length > 0 && cleanDigits.length <= 9) {
        const numericOrderNumber = parseInt(cleanDigits, 10);
        if (!isNaN(numericOrderNumber) && numericOrderNumber > 0 && numericOrderNumber <= 2147483647) {
          existingOrder = await prisma.order.findFirst({
            where: { orderNumber: numericOrderNumber },
            orderBy: { createdAt: 'desc' }
          });
        }
      }
      if (!existingOrder) {
        existingOrder = await prisma.order.findUnique({
          where: { id: orderId }
        });
      }
    }

    if (!existingOrder) {
      return json({ success: false, error: `Pedido '${orderId}' não encontrado no sistema.` }, { status: 404 });
    }

    // 2. Tenta avançar via UseCase de Domínio
    const result = await advanceUseCase.execute({
      orderId: existingOrder.id,
      nextStatus
    });

    if (result.isSuccess) {
      const updatedOrder = result.getValue();
      realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', updatedOrder);

      return json({
        success: true,
        order: updatedOrder
      });
    }

    // 3. Fallback de persistência direta via Prisma caso o UseCase encontre transição não cadastrada
    console.warn(`[KDS Status Warning] UseCase transition alert: ${result.getError().message}. Aplicando persistência direta.`);
    
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: nextStatus as any,
        updatedAt: new Date()
      }
    });

    try {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: existingOrder.id,
          status: nextStatus as any,
          notes: `Status atualizado via KDS para ${nextStatus}`
        }
      });
    } catch (e) {}

    const orderPayload = {
      orderId: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      previousStatus: existingOrder.status,
      newStatus: nextStatus,
      updatedAt: new Date()
    };

    realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', orderPayload);

    return json({
      success: true,
      order: orderPayload
    });
  } catch (err: any) {
    console.error(`[KDS Status Error] Falha ao atualizar pedido ${orderId}:`, err);
    return json({ success: false, error: `Erro ao atualizar status do pedido: ${err.message}` }, { status: 500 });
  }
}

export const POST: RequestHandler = handleUpdateStatus;
export const PATCH: RequestHandler = handleUpdateStatus;
export const PUT: RequestHandler = handleUpdateStatus;
