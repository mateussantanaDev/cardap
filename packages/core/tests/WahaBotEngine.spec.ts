import { describe, it, expect } from 'vitest';
import { ProcessWahaWebhookUseCase, type WahaWebhookPayload } from '../src/use-cases/crm/ProcessWahaWebhookUseCase';

describe('WAHA Bot Engine - WhatsApp Webhook & Auto Replies', () => {
  const useCase = new ProcessWahaWebhookUseCase('Imperius do Pastel', 'imperius-do-pastel');

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

  it('should process customer order message and return confirmation template with #47106 and order details', () => {
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

    const result = useCase.execute(payload);
    expect(result.isSuccess).toBe(true);
    const reply = result.getValue();

    expect(reply.shouldReply).toBe(true);
    expect(reply.to).toBe('184512130641926@lid');
    expect(reply.type).toBe('ORDER_CONFIRMATION');
    expect(reply.orderId).toBe('47106');
    expect(reply.customerName).toBe('Mateus Vieira');
    expect(reply.replyText).toContain('Olá Mateus Vieira, seu pedido *#47106* foi *confirmado*! ✅');
    expect(reply.replyText).toContain('*PEDIDO #47106*');
    expect(reply.replyText).toContain('*TOTAL FINAL*: R$ 29,00');
  });

  it('should process general inquiry with dynamic restaurant name and digital menu link', () => {
    const payload: WahaWebhookPayload = {
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
    const result = useCase.execute(payload, nightTime, 'Imperius do Pastel', 'imperius-do-pastel');

    expect(result.isSuccess).toBe(true);
    const reply = result.getValue();

    expect(reply.shouldReply).toBe(true);
    expect(reply.type).toBe('GREETING_MENU');
    expect(reply.replyText).toContain('Boa noite,');
    expect(reply.replyText).toContain('Imperius do Pastel agradece seu contato 😃');
    expect(reply.replyText).toContain('https://app.cardaperp.com.br/imperius-do-pastel');
    expect(reply.replyText).toContain('*OBS:* Realizando seu pedido pelo Cardápio Digital');
    expect(reply.replyText).toContain('PROGRAMA FIDELIDADE');
  });
});
