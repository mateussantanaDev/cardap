import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { sendWahaTextMessage } from '$lib/server/wahaClient';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const nextStatus = body.status || 'EM_PREPARO';

    const isUuid = orderId.includes('-') && orderId.length >= 32;
    const cleanDigits = orderId.replace(/\D/g, '');
    const numId = cleanDigits.length > 0 && cleanDigits.length <= 9 ? parseInt(cleanDigits, 10) : 0;

    const existing = isUuid
      ? await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } })
      : (numId > 0 ? await prisma.order.findFirst({ where: { orderNumber: numId }, include: { customer: true } }) : null) ||
        await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });

    if (!existing) {
      return json({ success: false, error: `Pedido '${orderId}' não encontrado.` }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        status: nextStatus as any,
        updatedAt: new Date()
      }
    });

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

    // Disparo real via WhatsApp Bot (WAHA) quando o pedido é marcado como Pronto/Despachado
    if ((nextStatus === 'PRONTO' || nextStatus === 'SAIU_PARA_ENTREGA') && existing.type === 'DELIVERY' && existing.customer?.phone) {
      const customerPhone = existing.customer.phone;
      const customerName = existing.customer.name || 'Cliente';

      const rest = locals.user?.restaurantId
        ? await prisma.restaurant.findUnique({ where: { id: locals.user.restaurantId } })
        : await prisma.restaurant.findFirst();

      const slug = rest?.slug || 'menu';
      const statusUrl = `https://usecardap.com.br/${slug}/status/${existing.orderNumber}`;
      const msg = `🔔 *Olá ${customerName}!* Seu pedido *#${existing.orderNumber}* está pronto e saiu para entrega! 🛵💨\n\n👉 Acompanhe seu pedido em tempo real: ${statusUrl}\n\nAgradecemos a preferência!`;

      const session = rest?.wahaSessionName || 'default';
      sendWahaTextMessage(customerPhone, msg, session).catch((err) => {
        console.warn(`[WAHA Auto-Notification Error] ${err?.message}`);
      });
    }

    return json({
      success: true,
      order: {
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        previousStatus: existing.status,
        newStatus: nextStatus,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err: any) {
    console.error(`[KDS Status Error] Falha ao atualizar pedido ${orderId}:`, err);
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

export const PATCH: RequestHandler = POST;
export const PUT: RequestHandler = POST;
