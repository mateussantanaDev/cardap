import { json, type RequestHandler } from '@sveltejs/kit';
import { ProcessWahaWebhookUseCase, type WahaWebhookPayload } from '@cardap/core';
import { sendWahaTextMessage } from '$lib/server/wahaClient';
import { prisma } from '@cardap/database';

const botUseCase = new ProcessWahaWebhookUseCase();
const processedMessageIds = new Set<string>();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = (await request.json()) as WahaWebhookPayload;

    console.log(`[WAHA Webhook] Evento: '${payload?.event}' | Sessão: '${payload?.session}' | De: '${payload?.payload?.from}'`);

    // 1. Evitar processamento duplo (ignorar evento redundante message.any quando message já existe)
    if (payload.event === 'message.any') {
      return json({ success: true, reason: 'Skipped message.any in favor of message event' });
    }

    // 2. Debounce/Deduplicação de mensagem por ID
    const msgId = payload?.payload?.id;
    if (msgId) {
      if (processedMessageIds.has(msgId)) {
        console.log(`[WAHA Webhook] Mensagem já processada anteriormente (ID: ${msgId}), ignorando.`);
        return json({ success: true, reason: 'Duplicate message ignored' });
      }
      processedMessageIds.add(msgId);
      setTimeout(() => processedMessageIds.delete(msgId), 30000);
    }

    // 3. Obter dados dinâmicos do restaurante ativo no banco de dados
    let restaurantName = 'Imperius do Pastel';
    let restaurantSlug = 'imperius-do-pastel';

    try {
      const dbRestaurant = await prisma.restaurant.findFirst();
      if (dbRestaurant) {
        restaurantName = dbRestaurant.name;
        restaurantSlug = dbRestaurant.slug;
      }
    } catch {
      // Fallback para defaults
    }

    // 4. Executar regra de negócio do bot
    const result = botUseCase.execute(payload, new Date(), restaurantName, restaurantSlug);
    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    const replyData = result.getValue();

    // 5. Se o bot deve responder, dispara via WAHA usando a sessão correta
    if (replyData.shouldReply && replyData.replyText && replyData.to) {
      console.log(`[WAHA Bot] Disparando resposta automática (${replyData.type}) via sessão '${payload.session}' para '${replyData.to}'`);
      
      const sent = await sendWahaTextMessage(replyData.to, replyData.replyText, payload.session);
      return json({
        success: true,
        replied: sent,
        type: replyData.type,
        to: replyData.to,
        session: payload.session
      });
    }

    return json({
      success: true,
      replied: false,
      reason: 'Ignored (fromMe or broadcast)'
    });
  } catch (err: any) {
    console.error(`[WAHA Webhook] Erro ao processar webhook:`, err.message);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
