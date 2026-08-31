import { json, type RequestHandler } from '@sveltejs/kit';
import { ProcessWahaWebhookUseCase, type WahaWebhookPayload } from '@cardap/core';
import { sendWahaTextMessage } from '$lib/server/wahaClient';
import { prisma } from '@cardap/database';

const botUseCase = new ProcessWahaWebhookUseCase();
const processedMessageIds = new Set<string>();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = (await request.json()) as WahaWebhookPayload;

    console.log(`[WAHA Webhook] Evento: '${payload?.event}' | Sessão: '${payload?.session}' | De: '${payload?.payload?.from}' | Para: '${payload?.payload?.to}'`);

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

    // 3. Resolução Multi-Tenant Rigorosa: Identificar qual o estabelecimento específico da mensagem pela sessão WAHA
    let targetRestaurant: any = null;

    try {
      const allRestaurants = await prisma.restaurant.findMany({
        orderBy: { updatedAt: 'desc' }
      });

      if (allRestaurants.length === 1) {
        targetRestaurant = allRestaurants[0];
      } else {
        if (payload?.session) {
          const cleanSession = payload.session.toLowerCase().trim();
          targetRestaurant = allRestaurants.find(r => {
            const restSession = (r.wahaSessionName || `rest_${r.slug}`).toLowerCase().trim();
            const restSlug = r.slug.toLowerCase().trim();
            return (
              restSession === cleanSession ||
              cleanSession === `rest_${restSlug}` ||
              cleanSession === restSlug ||
              cleanSession === 'default'
            );
          });
        }

        // Se a mensagem contém o link específico do cardápio do restaurante (ex: usecardap.com.br/slug-da-loja)
        if (!targetRestaurant && payload?.payload?.body) {
          const slugMatch = payload.payload.body.match(/(?:usecardap\.com\.br|cardaperp\.com\.br)\/([a-z0-9-]+)/i);
          if (slugMatch) {
            const matchedSlug = slugMatch[1].toLowerCase();
            targetRestaurant = allRestaurants.find(r => r.slug.toLowerCase() === matchedSlug);
          }
        }

        // Fallback garantido para o estabelecimento ativo
        if (!targetRestaurant && allRestaurants.length > 0) {
          targetRestaurant = allRestaurants[0];
        }
      }
    } catch (e: any) {
      console.error('Erro ao identificar restaurante do webhook:', e.message);
    }

    if (!targetRestaurant) {
      console.warn(`[WAHA Webhook] Nenhum estabelecimento correspondente encontrado para a sessão '${payload?.session}'. Ignorando.`);
      return json({ success: false, reason: 'Restaurant not found for session' });
    }

    // BUSCA AUTOMATICAMENTE O NOME E O SLUG CONFIGURADOS NO BANCO DE DADOS
    const restaurantName = targetRestaurant.name;
    const restaurantSlug = targetRestaurant.slug;

    console.log(`[WAHA Webhook] Estabelecimento identificado com isolamento: '${restaurantName}' (Slug: '${restaurantSlug}')`);

    // 4. Executar regra de negócio do bot com os dados do estabelecimento correto
    const result = botUseCase.execute(payload, new Date(), restaurantName, restaurantSlug);
    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    const replyData = result.getValue();

    // 5. Se o bot deve responder, dispara via WAHA usando a sessão correta
    if (replyData.shouldReply && replyData.replyText && replyData.to) {
      console.log(`[WAHA Bot] Disparando resposta automática (${replyData.type}) via sessão '${payload.session || targetRestaurant.wahaSessionName || 'default'}' para '${replyData.to}' com link: https://usecardap.com.br/${restaurantSlug}`);
      
      const sent = await sendWahaTextMessage(
        replyData.to,
        replyData.replyText,
        payload.session || targetRestaurant.wahaSessionName || 'default'
      );

      return json({
        success: true,
        replied: sent,
        type: replyData.type,
        to: replyData.to,
        session: payload.session,
        restaurant: {
          name: restaurantName,
          slug: restaurantSlug,
          menuUrl: `https://usecardap.com.br/${restaurantSlug}`
        }
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
