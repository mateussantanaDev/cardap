import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { realtimeBus } from '@cardap/realtime';
import { getServerOrderById, updateServerOrderStatus } from '$lib/server/ordersStore';

export const POST: RequestHandler = async ({ params, request }) => {
  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  try {
    let reason = 'Cancelado pelo cliente no autoatendimento';
    try {
      const body = await request.json();
      if (body.reason) reason = String(body.reason).trim();
    } catch {}

    // 1. Tentar localizar e cancelar no PostgreSQL
    try {
      const dbOrder = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (dbOrder) {
        const cancellableStatuses = ['PENDENTE', 'RECEBIDO', 'ABERTO'];
        if (!cancellableStatuses.includes(dbOrder.status)) {
          return json({
            success: false,
            error: `O pedido já está em estágio '${dbOrder.status}' na cozinha e não pode ser cancelado automaticamente. Por favor, chame o garçom.`
          }, { status: 400 });
        }

        const updated = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELADO',
            cancellationReason: reason,
            notes: `${dbOrder.notes || ''} [Cancelamento: ${reason}]`.trim(),
            updatedAt: new Date()
          }
        });

        // Se pertencer a uma mesa, verificar se ainda há pedidos ativos
        if (dbOrder.tableId) {
          const remainingOrders = await prisma.order.findMany({
            where: {
              tableId: dbOrder.tableId,
              status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] },
              id: { not: orderId }
            }
          });

          if (remainingOrders.length === 0) {
            await prisma.table.update({
              where: { id: dbOrder.tableId },
              data: { status: 'LIVRE' }
            });
          }
        }

        realtimeBus.publish('ORDER_EVENT', 'ORDER_STATUS_UPDATED', {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          previousStatus: dbOrder.status,
          newStatus: 'CANCELADO',
          tableId: dbOrder.tableId || undefined,
          reason
        });

        return json({
          success: true,
          status: 'CANCELADO',
          order: updated
        });
      }
    } catch (dbErr) {
      console.warn('Fallback cancelamento DB:', dbErr);
    }

    // 2. Fallback de memória
    const memOrder = getServerOrderById(orderId);
    if (memOrder) {
      const cancellableStatuses = ['PENDENTE', 'RECEBIDO', 'ABERTO'];
      if (!cancellableStatuses.includes(memOrder.status)) {
        return json({
          success: false,
          error: `O pedido já está em estágio '${memOrder.status}' e não pode ser cancelado automaticamente. Chame o garçom.`
        }, { status: 400 });
      }

      updateServerOrderStatus(orderId, 'CANCELADO');
      return json({
        success: true,
        status: 'CANCELADO',
        order: getServerOrderById(orderId)
      });
    }

    return json({
      success: true,
      status: 'CANCELADO',
      order: { id: orderId, status: 'CANCELADO' }
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao cancelar pedido: ${err.message}` }, { status: 500 });
  }
};
