import { describe, it, expect } from 'vitest';
import { buildWhatsAppOrderMessage, type OrderWhatsAppMessageData } from '../src/lib/services/whatsappOrderFormatter';

describe('WhatsApp Order Message Formatter (Anti-Ban 24h Window)', () => {
  it('should format pizza delivery order with flavors, additionals, change and tracking link correctly', () => {
    const orderData: OrderWhatsAppMessageData = {
      restaurantName: 'FJ Pizzaria',
      orderId: '40174',
      customerName: 'Cliente Teste',
      customerPhone: '(11) 99999-9999',
      deliveryType: 'Delivery',
      estimatedTime: '24/05/2026 19:36',
      paymentName: 'Dinheiro',
      fullAddress: 'Centro, Rua das Flores, 100, Apto 42, Próximo ao metrô',
      orderNotes: 'Entregar na portaria',
      items: [
        {
          name: 'Pizza PP',
          qty: 1,
          priceFormatted: 'R$20.00',
          additionalFormatted: '(Adicional R$6.00)',
          subItems: [
            { label: '1/1', name: 'Camarão' }
          ]
        }
      ],
      subtotalFormatted: 'R$26,00',
      deliveryFeeFormatted: 'R$3,00',
      totalFormatted: 'R$29,00',
      changeForFormatted: 'R$50.00',
      statusUrl: 'https://app.zapermenu.com.br/fj-pizzaria/acompanhe-seu-pedido/310f3df4-d726-41ca-ae5e-4e9f1ded81b5'
    };

    const message = buildWhatsAppOrderMessage(orderData);

    expect(message).toContain('*FJ Pizzaria*');
    expect(message).toContain('*PEDIDO #40174*');
    expect(message).toContain('*Nome*: Cliente Teste');
    expect(message).toContain('*WhatsApp*: (11) 99999-9999');
    expect(message).toContain('*Forma Entrega*: Delivery');
    expect(message).toContain('*Prazo Estimado*: 24/05/2026 19:36');
    expect(message).toContain('*Pagamento*: Dinheiro');
    expect(message).toContain('*Endereço*: Centro, Rua das Flores, 100, Apto 42, Próximo ao metrô');
    expect(message).toContain('*Obs*: Entregar na portaria');
    expect(message).toContain('*1* Pizza PP (R$20.00)');
    expect(message).toContain('>>> Sabores _(Adicional R$6.00)_ <<<');
    expect(message).toContain('*1/1* Camarão');
    expect(message).toContain('*TOTAL PRODUTOS*: R$26,00');
    expect(message).toContain('*TAXA DE ENTREGA*: R$3,00');
    expect(message).toContain('*TOTAL FINAL*: R$29,00');
    expect(message).toContain('*Troco para*: R$50.00');
    expect(message).toContain('Muito obrigado pela preferência!');
    expect(message).toContain('_Para facilitar a entrega envie-nos a Localização Fixa do Whatsapp_');
    expect(message).toContain('*👉Acompanhe o andamento do pedido:* https://app.zapermenu.com.br/fj-pizzaria/acompanhe-seu-pedido/310f3df4-d726-41ca-ae5e-4e9f1ded81b5');
  });
});
