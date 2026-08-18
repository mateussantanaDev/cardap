import { json, type RequestHandler } from '@sveltejs/kit';
import { ProcessCrmWebhookUseCase } from '@cardap/core';
import { PrismaCustomerRepository } from '@cardap/database';

const customerRepo = new PrismaCustomerRepository();
const webhookUseCase = new ProcessCrmWebhookUseCase(customerRepo);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const event = body.event || body.type || 'messages.upsert';
    const instanceId = body.instance || body.instanceId;

    const data = {
      remoteJid: body.data?.key?.remoteJid || body.data?.remoteJid,
      phone: body.data?.key?.remoteJid ? body.data.key.remoteJid.split('@')[0] : body.data?.phone,
      pushName: body.data?.pushName || body.data?.name,
      messageText: body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || body.data?.text,
      fromMe: body.data?.key?.fromMe ?? false
    };

    await webhookUseCase.execute({
      event,
      instanceId,
      data
    });

    return json({ success: true, received: true });
  } catch (err: any) {
    console.error('[CRM WEBHOOK ERROR]', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
