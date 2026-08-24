import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { realtimeBus } from '@cardap/realtime';

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
    const nextStatus = body.status;

    if (!nextStatus) {
      return json({ success: false, error: 'Informe o novo status do pedido.' }, { status: 400 });
    }

    const isUuid = orderId.includes('-') && orderId.length >= 32;
    const existingOrder = isUuid
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : await prisma.order.findFirst({ where: { orderNumber: parseInt(orderId.replace(/\D/g, ''), 10) || 0 } });

    if (!existingOrder) {
      return json({ success: false, error: `Pedido '${orderId}' não encontrado.` }, { status: 404 });
    }

    const updated = await prisma.order.update({
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
          notes: `Status alterado no KDS para ${nextStatus}`
        }
      });
    } catch {}

    const orderPayload = {
      orderId: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      previousStatus: existingOrder.status,
      newStatus: nextStatus,
      updatedAt: updated.updatedAt
    };

    try {
      realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', orderPayload);
    } catch {}

    return json({
      success: true,
      order: orderPayload
    });
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
