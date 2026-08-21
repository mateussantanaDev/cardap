import { Result } from '../../shared/Result';
import { DomainError } from '../../shared/DomainError';

export interface WahaWebhookPayload {
  event: string; // ex: "message", "message.any"
  session: string;
  payload: {
    id: string;
    timestamp?: number;
    from: string; // ex: "5511999999999@c.us" ou "184512130641926@lid"
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
  reason?: string;
}

export class ProcessWahaWebhookUseCase {
  // Controle anti-spam: Registrar última saudação por cliente (janela de 24h)
  private greetingSentMap = new Map<string, number>();
  // Controle anti-duplicação: Registrar confirmações de pedidos já emitidas
  private confirmedOrdersMap = new Map<string, number>();

  constructor(
    private defaultRestaurantName: string = 'Imperius do Pastel',
    private defaultMenuSlug: string = 'imperius-do-pastel',
    private greetingCooldownMs: number = 24 * 60 * 60 * 1000 // 24 horas
  ) {}

  execute(
    data: WahaWebhookPayload,
    now: Date = new Date(),
    restaurantName?: string,
    menuSlug?: string
  ): Result<WahaBotReplyResult, DomainError> {
    // 1. Ignorar mensagens enviadas pelo próprio bot (anti-loop)
    if (!data.payload || data.payload.fromMe) {
      return Result.ok({ shouldReply: false, to: data.payload?.from || '', reason: 'Ignored fromMe message' });
    }

    const from = data.payload.from;
    // 2. Ignorar status do WhatsApp e grupos
    if (!from || from.includes('status@broadcast') || from.includes('@g.us')) {
      return Result.ok({ shouldReply: false, to: from, reason: 'Ignored broadcast/group message' });
    }

    const body = (data.payload.body || '').trim();
    if (!body) {
      return Result.ok({ shouldReply: false, to: from, reason: 'Empty body' });
    }

    const nowTs = now.getTime();

    // 3. Caso A: Cliente enviou o resumo de um pedido (*PEDIDO #...)
    const orderMatch = body.match(/PEDIDO\s*#(\d+)/i);
    if (orderMatch) {
      const orderId = orderMatch[1];

      // Verificar se este pedido já foi confirmado para evitar loops e mensagens repetidas
      if (this.confirmedOrdersMap.has(orderId)) {
        return Result.ok({
          shouldReply: false,
          to: from,
          orderId,
          reason: 'ORDER_ALREADY_CONFIRMED'
        });
      }

      this.confirmedOrdersMap.set(orderId, nowTs);

      // Também registra que o cliente já interagiu, para não disparar saudação de menu imediatamente após o pedido
      this.greetingSentMap.set(from, nowTs);

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
    const lastGreetingTime = this.greetingSentMap.get(from);
    if (lastGreetingTime && (nowTs - lastGreetingTime) < this.greetingCooldownMs) {
      // Cliente já recebeu a saudação inicial dentro da janela de 24h — Não reenviar
      return Result.ok({
        shouldReply: false,
        to: from,
        reason: 'GREETING_ALREADY_SENT'
      });
    }

    // Grava timestamp da saudação inicial
    this.greetingSentMap.set(from, nowTs);

    const hour = now.getHours();
    let greeting = 'Boa noite';
    if (hour >= 5 && hour < 12) {
      greeting = 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde';
    }

    const activeRestaurantName = restaurantName || this.defaultRestaurantName;
    const activeSlug = menuSlug || this.defaultMenuSlug;
    const menuUrl = `https://app.cardaperp.com.br/${activeSlug}`;

    const replyText = `${greeting},
${activeRestaurantName} agradece seu contato 😃

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

  // Método auxiliar para testes e limpeza
  public resetCooldowns(): void {
    this.greetingSentMap.clear();
    this.confirmedOrdersMap.clear();
  }
}
