import { json, type RequestHandler } from '@sveltejs/kit';
import { AdvanceKdsStatusUseCase, type OrderStatus } from '@cardap/core';
import { PrismaOrderRepository, prisma } from '@cardap/database';
import { realtimeBus } from '@cardap/realtime';

const orderRepo = new PrismaOrderRepository();
const advanceUseCase = new AdvanceKdsStatusUseCase(orderRepo);

async function handleUpdateStatus({ params, request, locals }: { params: any; request: Request; locals: any }) {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const nextStatus = (body.status || 'EM_PREPARO') as OrderStatus;

    // 1. Tenta pelo UseCase de Domínio
    const result = await advanceUseCase.execute({
      orderId,
      nextStatus
    });

    if (result.isSuccess) {
      const order = result.getValue();
      try {
        realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', order);
      } catch {}
      return json({ success: true, order });
    }

    // 2. Fallback direto no Prisma se houver mismatch de estado
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      return json({ success: false, error: result.getError().message }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { status: nextStatus as any, updatedAt: new Date() }
    });

    const orderPayload = {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      previousStatus: existing.status,
      newStatus: nextStatus,
      updatedAt: updated.updatedAt
    };

    try {
      realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', orderPayload);
    } catch {}

    return json({ success: true, order: orderPayload });
  } catch (err: any) {
    console.error(`[KDS Status Error] Falha ao atualizar pedido ${orderId}:`, err);
    return json({ success: false, error: `Erro ao atualizar status: ${err.message}` }, { status: 500 });
  }
}

export const GET: RequestHandler = async ({ params }) => {
  const orderId = params.id;
  try {
    const isUuid = orderId && orderId.includes('-') && orderId.length >= 32;
    const order = isUuid
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : await prisma.order.findFirst({ where: { orderNumber: parseInt(orderId.replace(/\D/g, ''), 10) || 0 } });

    if (!order) {
      return json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 });
    }
    return json({ success: true, order });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const POST: RequestHandler = handleUpdateStatus;
export const PATCH: RequestHandler = handleUpdateStatus;
export const PUT: RequestHandler = handleUpdateStatus;
