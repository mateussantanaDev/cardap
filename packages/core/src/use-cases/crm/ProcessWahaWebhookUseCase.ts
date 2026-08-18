import { Result } from '../../shared/Result';
import { DomainError } from '../../shared/DomainError';

export interface WahaWebhookPayload {
  event: string; // ex: "message", "message.any"
  session: string;
  payload: {
    id: string;
    timestamp?: number;
    from: string; // ex: "5587996036770@c.us"
    fromMe: boolean;
    to?: string;
    body?: string;
    hasMedia?: boolean;
    _data?: {
      notifyName?: string;
    };
  };
}

export interface WahaBotReplyResult {
  shouldReply: boolean;
  to: string;
  replyText?: string;
  type?: 'ORDER_CONFIRMATION' | 'GREETING_MENU';
  orderId?: string;
  customerName?: string;
}

export class ProcessWahaWebhookUseCase {
  constructor(
    private defaultRestaurantName: string = 'FJ Pizzaria',
    private defaultMenuSlug: string = 'fj-pizzaria'
  ) {}

  execute(data: WahaWebhookPayload, now: Date = new Date()): Result<WahaBotReplyResult, DomainError> {
    // 1. Ignorar mensagens enviadas pelo próprio bot (anti-loop)
    if (!data.payload || data.payload.fromMe) {
      return Result.ok({ shouldReply: false, to: data.payload?.from || '' });
    }

    const from = data.payload.from;
    // 2. Ignorar status do WhatsApp e grupos
    if (!from || from.includes('status@broadcast') || from.includes('@g.us')) {
      return Result.ok({ shouldReply: false, to: from });
    }

    const body = (data.payload.body || '').trim();
    if (!body) {
      return Result.ok({ shouldReply: false, to: from });
    }

    // 3. Caso A: Cliente enviou o resumo de um pedido (*PEDIDO #...)
    const orderMatch = body.match(/PEDIDO\s*#(\d+)/i);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const nameMatch = body.match(/\*Nome\*:\s*([^\n\r]+)/i);
      const customerName = nameMatch
        ? nameMatch[1].trim()
        : data.payload._data?.notifyName || 'Cliente';

      const replyText = `Olá ${customerName}, seu pedido *#${orderId}* foi *confirmado*! ✅\n${body}`;

      return Result.ok({
        shouldReply: true,
        to: from,
        replyText,
        type: 'ORDER_CONFIRMATION',
        orderId,
        customerName
      });
    }

    // 4. Caso B: Mensagem avulsa / Dúvida / Primeiro contato sem pedido
    const hour = now.getHours();
    let greeting = 'Boa noite';
    if (hour >= 5 && hour < 12) {
      greeting = 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde';
    }

    const menuUrl = `https://app.cardaperp.com.br/${this.defaultMenuSlug}`;

    const replyText = `${greeting},
${this.defaultRestaurantName} agradece seu contato 😃

Confira nossas ofertas exclusivas e faça seu pedido através do nosso Cardápio Digital, link abaixo: 👇🏻

${menuUrl}

*OBS:* Realizando seu pedido pelo Cardápio Digital, seu pedido vai direto para a cozinha e é preparado mais rapidamente.😉

*Devido a demanda de atendimento, podemos não conseguir retirar seu pedido pelo WhatsApp... Então, sugerimos que já peça no link e, assim, garanta seus pontos no PROGRAMA FIDELIDADE*

ATENÇÃO no contato informado durante o pedido, pois iremos te avisando do preparo e saída para entrega através dele 😊

Agradecemos a Preferência!`;

    return Result.ok({
      shouldReply: true,
      to: from,
      replyText,
      type: 'GREETING_MENU'
    });
  }
}
