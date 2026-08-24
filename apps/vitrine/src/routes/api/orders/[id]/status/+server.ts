import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { realtimeBus } from '@cardap/realtime';
import { updateServerOrderStatus, getServerOrderById } from '$lib/server/ordersStore';

export const POST: RequestHandler = async ({ params, request }) => {
  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID do pedido é obrigatório.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const newStatus = body.status;

    const validStatuses = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'];
    if (!validStatuses.includes(newStatus)) {
      return json({ success: false, error: `Status '${newStatus}' inválido.` }, { status: 400 });
    }

    // Atualizar no PostgreSQL
    const isUuid = orderId.includes('-') && orderId.length >= 32;
    const cleanDigits = orderId.replace(/\D/g, '');
    const numId = cleanDigits.length > 0 && cleanDigits.length <= 9 ? parseInt(cleanDigits, 10) : 0;

    let dbOrder = isUuid
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : (numId > 0 ? await prisma.order.findFirst({ where: { orderNumber: numId } }) : null) ||
        await prisma.order.findUnique({ where: { id: orderId } });

    if (dbOrder) {
      await prisma.order.update({
        where: { id: dbOrder.id },
        data: { status: newStatus as any, updatedAt: new Date() }
      });
      try {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: dbOrder.id,
            status: newStatus as any,
            notes: `Status atualizado via vitrine para ${newStatus}`
          }
        });
      } catch {}
    }

    // Atualizar store em memória
    const updated = updateServerOrderStatus(orderId, newStatus);

    const eventPayload = {
      orderId: dbOrder ? dbOrder.id : orderId,
      orderNumber: dbOrder ? dbOrder.orderNumber : (updated ? updated.orderNumber : 101),
      previousStatus: dbOrder ? dbOrder.status : 'RECEBIDO',
      newStatus,
      updatedAt: new Date()
    };

    try {
      realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', eventPayload);
    } catch {}

    return json({
      success: true,
      orderId,
      newStatus,
      eventPayload
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao atualizar status: ${err.message}` }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ params }) => {
  const orderId = params.id;
  try {
    const isUuid = orderId && orderId.includes('-') && orderId.length >= 32;
    const cleanDigits = (orderId || '').replace(/\D/g, '');
    const numId = cleanDigits.length > 0 && cleanDigits.length <= 9 ? parseInt(cleanDigits, 10) : 0;

    const order = isUuid
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : (numId > 0 ? await prisma.order.findFirst({ where: { orderNumber: numId } }) : null) ||
        await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 });
    }
    return json({ success: true, order });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
