import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { getServerOrderById, updateServerOrderStatus } from '$lib/server/ordersStore';

export const POST: RequestHandler = async ({ params, request }) => {
  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  try {
    let reason = 'Cancelado pelo cliente antes do preparo';
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
        if (dbOrder.status !== 'RECEBIDO' && dbOrder.status !== 'ABERTO') {
          return json({
            success: false,
            error: `O pedido já está em estágio '${dbOrder.status}' na cozinha e não pode ser cancelado automaticamente. Fale com a loja via WhatsApp.`
          }, { status: 400 });
        }

        const updated = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELADO',
            notes: `${dbOrder.notes || ''} [Cancelamento: ${reason}]`.trim()
          }
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

    // 2. Fallback memória
    const memOrder = getServerOrderById(orderId);
    if (memOrder) {
      if (memOrder.status !== 'RECEBIDO') {
        return json({
          success: false,
          error: `O pedido já está em estágio '${memOrder.status}' e não pode ser cancelado automaticamente.`
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
    return json({ success: false, error: `Erro ao cancelar: ${err.message}` }, { status: 500 });
  }
};
