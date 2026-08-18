import { json, type RequestHandler } from '@sveltejs/kit';
import { ProcessWahaWebhookUseCase, type WahaWebhookPayload } from '@cardap/core';
import { sendWahaTextMessage } from '$lib/server/wahaClient';

const botUseCase = new ProcessWahaWebhookUseCase('FJ Pizzaria', 'fj-pizzaria');

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = (await request.json()) as WahaWebhookPayload;

    console.log(`[WAHA Webhook] Evento recebido: ${payload?.event} (Sessão: ${payload?.session})`);

    const result = botUseCase.execute(payload);
    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    const replyData = result.getValue();

    if (replyData.shouldReply && replyData.replyText && replyData.to) {
      console.log(`[WAHA Bot] Disparando resposta automática (${replyData.type}) para: ${replyData.to}`);
      const sent = await sendWahaTextMessage(replyData.to, replyData.replyText);
      return json({
        success: true,
        replied: sent,
        type: replyData.type,
        to: replyData.to
      });
    }

    return json({
      success: true,
      replied: false,
      reason: 'Ignored (fromMe or invalid chat)'
    });
  } catch (err: any) {
    console.error(`[WAHA Webhook] Erro ao processar webhook:`, err.message);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
