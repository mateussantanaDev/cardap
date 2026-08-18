import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessWahaWebhookUseCase, type WahaWebhookPayload } from '../src/use-cases/crm/ProcessWahaWebhookUseCase';

describe('WAHA Bot Engine - WhatsApp Webhook & Auto Replies', () => {
  let useCase: ProcessWahaWebhookUseCase;

  beforeEach(() => {
    useCase = new ProcessWahaWebhookUseCase('Imperius do Pastel', 'imperius-do-pastel');
  });

  it('should ignore outbound messages fromMe: true to prevent message loops', () => {
    const payload: WahaWebhookPayload = {
      event: 'message',
      session: 'default',
      payload: {
        id: 'msg-1',
        from: '5587996036770@c.us',
        fromMe: true,
        body: 'Olá'
      }
    };

    const result = useCase.execute(payload);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().shouldReply).toBe(false);
  });

  it('should process customer order message and return confirmation template, but ignore duplicate order submissions', () => {
    const incomingOrderBody = `*Imperius do Pastel*

*PEDIDO #47106*

*Nome*: Mateus Vieira
*WhatsApp*: (87) 9 9603-6770
*Forma Entrega*: Delivery
*Prazo Estimado*: 15/08/2026 19:48
*Pagamento*: Cartão de Debito
*Endereço*: Águas Belas, COMUNATY, Trav Padre Nelson, 299, casa
________________________________________

*1* Pastel Monte seu Pastel (R$ 23,00)
   >>> Adicionais <<<
    *1/1* Carne Moída + Catupiry
________________________________________
*TOTAL PRODUTOS*: R$ 23,00
*TAXA DE ENTREGA*: R$ 6,00
*TOTAL FINAL*: R$ 29,00


Muito obrigado pela preferência!
_Para facilitar a entrega envie-nos a Localização Fixa do Whatsapp_

*👉 Acompanhe o andamento do pedido:* https://app.cardaperp.com.br/imperius-do-pastel/status/47106`;

    const payload: WahaWebhookPayload = {
      event: 'message',
      session: 'Imperiuspastel',
      payload: {
        id: 'msg-2',
        from: '184512130641926@lid',
        fromMe: false,
        body: incomingOrderBody,
        _data: {
          notifyName: 'Mateus Vieira'
        }
      }
    };

    // 1º envio do pedido -> Deve responder confirmando
    const result1 = useCase.execute(payload);
    expect(result1.isSuccess).toBe(true);
    const reply1 = result1.getValue();

    expect(reply1.shouldReply).toBe(true);
    expect(reply1.to).toBe('184512130641926@lid');
    expect(reply1.type).toBe('ORDER_CONFIRMATION');
    expect(reply1.orderId).toBe('47106');
    expect(reply1.customerName).toBe('Mateus Vieira');
    expect(reply1.replyText).toContain('Olá Mateus Vieira, seu pedido *#47106* foi *confirmado*! ✅');

    // 2º envio do mesmo pedido (ou mensagem redundante) -> NÃO deve reenviar confirmação
    const payloadDuplicate = { ...payload, payload: { ...payload.payload, id: 'msg-2-dup' } };
    const result2 = useCase.execute(payloadDuplicate);
    expect(result2.isSuccess).toBe(true);
    expect(result2.getValue().shouldReply).toBe(false);
    expect(result2.getValue().reason).toBe('ORDER_ALREADY_CONFIRMED');
  });

  it('should send greeting ONLY ONCE per customer interaction within 24 hours (no infinite spam)', () => {
    const payload1: WahaWebhookPayload = {
      event: 'message',
      session: 'Imperiuspastel',
      payload: {
        id: 'msg-3',
        from: '5587996036770@c.us',
        fromMe: false,
        body: 'Boa noite, qual o cardapio de voces?'
      }
    };

    const nightTime = new Date('2026-08-17T20:00:00');
    // 1ª mensagem do cliente -> Dispara saudação inicial
    const result1 = useCase.execute(payload1, nightTime, 'Imperius do Pastel', 'imperius-do-pastel');
    expect(result1.isSuccess).toBe(true);
    const reply1 = result1.getValue();
    expect(reply1.shouldReply).toBe(true);
    expect(reply1.type).toBe('GREETING_MENU');
    expect(reply1.replyText).toContain('Boa noite,');
    expect(reply1.replyText).toContain('Imperius do Pastel agradece seu contato 😃');

    // 2ª mensagem do mesmo cliente logo em seguida -> NÃO deve responder com saudação repetida
    const payload2: WahaWebhookPayload = {
      event: 'message',
      session: 'Imperiuspastel',
      payload: {
        id: 'msg-4',
        from: '5587996036770@c.us',
        fromMe: false,
        body: 'Vocês entregam no centro?'
      }
    };
    const result2 = useCase.execute(payload2, new Date('2026-08-17T20:02:00'), 'Imperius do Pastel', 'imperius-do-pastel');
    expect(result2.isSuccess).toBe(true);
    expect(result2.getValue().shouldReply).toBe(false);
    expect(result2.getValue().reason).toBe('GREETING_ALREADY_SENT');

    // 3ª mensagem do mesmo cliente -> Continua sem spam
    const payload3: WahaWebhookPayload = {
      event: 'message',
      session: 'Imperiuspastel',
      payload: {
        id: 'msg-5',
        from: '5587996036770@c.us',
        fromMe: false,
        body: 'Obrigado!'
      }
    };
    const result3 = useCase.execute(payload3, new Date('2026-08-17T20:05:00'), 'Imperius do Pastel', 'imperius-do-pastel');
    expect(result3.isSuccess).toBe(true);
    expect(result3.getValue().shouldReply).toBe(false);
    expect(result3.getValue().reason).toBe('GREETING_ALREADY_SENT');
  });
});
