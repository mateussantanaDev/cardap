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

    // 1. Localizar pedido no banco (por UUID ou número de pedido)
    const isUuid = orderId.includes('-') && orderId.length >= 32;
    const cleanDigits = orderId.replace(/\D/g, '');
    const numId = cleanDigits.length > 0 && cleanDigits.length <= 9 ? parseInt(cleanDigits, 10) : 0;

    const existing = isUuid
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : (numId > 0 ? await prisma.order.findFirst({ where: { orderNumber: numId } }) : null) ||
        await prisma.order.findUnique({ where: { id: orderId } });

    if (!existing) {
      return json({ success: false, error: `Pedido '${orderId}' não encontrado.` }, { status: 404 });
    }

    // 2. Atualizar status diretamente no PostgreSQL
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        status: nextStatus as any,
        updatedAt: new Date()
      }
    });

    // 3. Registrar histórico com segurança
    try {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: existing.id,
          userId: locals.user?.id || undefined,
          status: nextStatus as any,
          notes: `Status alterado no KDS para ${nextStatus}`
        }
      });
    } catch {}

    const orderPayload = {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      previousStatus: existing.status,
      newStatus: nextStatus,
      updatedAt: updated.updatedAt
    };

    // 4. Disparar evento de tempo real
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
