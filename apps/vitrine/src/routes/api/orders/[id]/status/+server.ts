import { json, type RequestHandler } from '@sveltejs/kit';
import { KdsRealtimeService } from '@cardap/realtime';
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

    const currentOrder = getServerOrderById(orderId);
    const previousStatus = currentOrder ? currentOrder.status : 'RECEBIDO';

    const updated = updateServerOrderStatus(orderId, newStatus);

    // Disparar evento em tempo real via KdsRealtimeService para todos os clientes conectados
    const eventPayload = KdsRealtimeService.notifyStatusChanged({
      orderId,
      orderNumber: updated ? updated.orderNumber : 101,
      type: updated ? updated.type : 'DELIVERY',
      previousStatus,
      newStatus,
      tableNumber: updated ? updated.tableNumber : undefined,
      customerName: updated ? updated.customerName : undefined
    });

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
