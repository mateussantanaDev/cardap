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

    // 3. Resolução Multi-Tenant: Identificar qual o estabelecimento específico da mensagem
    let targetRestaurant: any = null;

    try {
      const allRestaurants = await prisma.restaurant.findMany();

      // Estratégia A: Buscar por slug ou nome da sessão WAHA
      if (payload?.session) {
        const cleanSession = payload.session.toLowerCase().replace(/[^a-z0-9]/g, '');
        targetRestaurant = allRestaurants.find(r => {
          const cleanSlug = r.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanName = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanSlug.includes(cleanSession) || cleanSession.includes(cleanSlug) || cleanName.includes(cleanSession) || cleanSession.includes(cleanName);
        });
      }

      // Estratégia B: Se a mensagem tem link de status com o slug (ex: cardaperp.com.br/imperius-do-pastel/status/...)
      if (!targetRestaurant && payload?.payload?.body) {
        const slugMatch = payload.payload.body.match(/cardaperp\.com\.br\/([a-z0-9-]+)\/(?:status|acompanhe)/i);
        if (slugMatch) {
          const matchedSlug = slugMatch[1].toLowerCase();
          targetRestaurant = allRestaurants.find(r => r.slug.toLowerCase() === matchedSlug);
        }
      }

      // Estratégia C: Se a mensagem começa com o nome da loja (*Nome da Loja*)
      if (!targetRestaurant && payload?.payload?.body) {
        const nameMatch = payload.payload.body.match(/^\*([^*]+)\*/);
        if (nameMatch) {
          const parsedStoreName = nameMatch[1].trim().toLowerCase();
          targetRestaurant = allRestaurants.find(r => r.name.toLowerCase() === parsedStoreName);
        }
      }

      // Estratégia D: Buscar pelo número de telefone destinatário (payload.to)
      if (!targetRestaurant && payload?.payload?.to) {
        const cleanToDigits = payload.payload.to.replace(/\D/g, '');
        targetRestaurant = allRestaurants.find(r => {
          const restDigits = (r.phone || '').replace(/\D/g, '');
          return restDigits && (cleanToDigits.includes(restDigits) || restDigits.includes(cleanToDigits));
        });
      }

      // Estratégia E: Fallback para o primeiro restaurante cadastrado
      if (!targetRestaurant && allRestaurants.length > 0) {
        targetRestaurant = allRestaurants[0];
      }
    } catch (e: any) {
      console.error('Erro ao identificar restaurante do webhook:', e.message);
    }

    const restaurantName = targetRestaurant?.name || 'Imperius do Pastel';
    const restaurantSlug = targetRestaurant?.slug || 'imperius-do-pastel';

    console.log(`[WAHA Webhook] Estabelecimento identificado: '${restaurantName}' (Slug: '${restaurantSlug}')`);

    // 4. Executar regra de negócio do bot com os dados do estabelecimento correto
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
        session: payload.session,
        restaurant: {
          name: restaurantName,
          slug: restaurantSlug
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
