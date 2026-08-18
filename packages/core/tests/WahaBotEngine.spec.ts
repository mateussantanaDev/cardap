import { describe, it, expect } from 'vitest';
import { ProcessWahaWebhookUseCase, type WahaWebhookPayload } from '../src/use-cases/crm/ProcessWahaWebhookUseCase';

describe('WAHA Bot Engine - WhatsApp Webhook & Auto Replies', () => {
  const useCase = new ProcessWahaWebhookUseCase('FJ Pizzaria', 'fj-pizzaria');

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
    const incomingOrderBody = `*FJ Pizzaria*

*PEDIDO #47106*

*Nome*: Mateus Vieira
*WhatsApp*: (87) 9 9603-6770
*Forma Entrega*: Delivery
*Prazo Estimado*: 15/08/2026 19:48
*Pagamento*: Cartão de Debito
*Endereço*: Águas Belas, COMUNATY, Trav Padre Nelson, 299, casa, Primeira esquina à esquerda após armazém das Petronios e segunda à direita, casa toda branca
________________________________________

*1* Pizza Grande (R$ 50)
   >>> Sabores _8,00_ <<<
    *1/2* Calabresa Com Cheddar
    *1/2* Camarão
________________________________________
*TOTAL PRODUTOS*: R$ 58,00
*TAXA DE ENTREGA*: R$ 3,00
*TOTAL FINAL*: R$ 61,00


Muito obrigado pela preferência!
_Para facilitar a entrega envie-nos a Localização Fixa do Whatsapp_

*👉 Acompanhe o andamento do pedido:* https://app.zapermenu.com.br/fj-pizzaria/acompanhe-seu-pedido/8789ad6c-f71e-42e7-8205-2067caacedb4`;

    const payload: WahaWebhookPayload = {
      event: 'message',
      session: 'default',
      payload: {
        id: 'msg-2',
        from: '5587996036770@c.us',
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
    expect(reply.type).toBe('ORDER_CONFIRMATION');
    expect(reply.orderId).toBe('47106');
    expect(reply.customerName).toBe('Mateus Vieira');
    expect(reply.replyText).toContain('Olá Mateus Vieira, seu pedido *#47106* foi *confirmado*! ✅');
    expect(reply.replyText).toContain('*PEDIDO #47106*');
    expect(reply.replyText).toContain('*1/2* Calabresa Com Cheddar');
    expect(reply.replyText).toContain('*TOTAL FINAL*: R$ 61,00');
  });

  it('should process general inquiry and return greeting with digital menu link and loyalty notice', () => {
    const payload: WahaWebhookPayload = {
      event: 'message',
      session: 'default',
      payload: {
        id: 'msg-3',
        from: '5587996036770@c.us',
        fromMe: false,
        body: 'Boa noite, qual o cardapio de voces?'
      }
    };

    const nightTime = new Date('2026-08-17T20:00:00');
    const result = useCase.execute(payload, nightTime);

    expect(result.isSuccess).toBe(true);
    const reply = result.getValue();

    expect(reply.shouldReply).toBe(true);
    expect(reply.type).toBe('GREETING_MENU');
    expect(reply.replyText).toContain('Boa noite,');
    expect(reply.replyText).toContain('FJ Pizzaria agradece seu contato 😃');
    expect(reply.replyText).toContain('https://app.cardaperp.com.br/fj-pizzaria');
    expect(reply.replyText).toContain('*OBS:* Realizando seu pedido pelo Cardápio Digital');
    expect(reply.replyText).toContain('PROGRAMA FIDELIDADE');
  });
});
