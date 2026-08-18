export interface FormattedOrderItem {
  name: string;
  qty: number;
  priceFormatted: string;
  fractionSummary?: string; // ex: "1/1 Camarão" ou "1/2 Calabresa, 1/2 Frango"
  additionalFormatted?: string; // ex: "(Adicional R$6.00)"
  subItems?: Array<{ label: string; name: string }>;
  obs?: string;
}

export interface OrderWhatsAppMessageData {
  restaurantName: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  estimatedTime: string;
  paymentName: string;
  fullAddress: string;
  orderNotes?: string;
  items: FormattedOrderItem[];
  subtotalFormatted: string;
  deliveryFeeFormatted: string;
  totalFormatted: string;
  changeForFormatted?: string;
  statusUrl: string;
}

export function buildWhatsAppOrderMessage(d: OrderWhatsAppMessageData): string {
  const itemsText = d.items
    .map(item => {
      let text = `*${item.qty}* ${item.name} (${item.priceFormatted})`;
      if (item.subItems && item.subItems.length > 0) {
        const additionalText = item.additionalFormatted ? ` _${item.additionalFormatted}_` : '';
        text += `\n   >>> Sabores${additionalText} <<<\n` + item.subItems.map(s => `    *${s.label}* ${s.name}`).join('\n');
      } else if (item.fractionSummary) {
        text += `\n   >>> Sabores <<<\n    ${item.fractionSummary}`;
      }
      if (item.obs) {
        text += `\n_Obs: (${item.obs})_`;
      }
      return text;
    })
    .join('\n\n');

  const obsBlock = d.orderNotes ? `\n*Obs*: ${d.orderNotes}` : '';
  const trocoBlock = d.changeForFormatted ? `\n\n*Troco para*: ${d.changeForFormatted}` : '';

  return `*${d.restaurantName}*

*PEDIDO #${d.orderId}*
*Nome*: ${d.customerName}
*WhatsApp*: ${d.customerPhone}
*Forma Entrega*: ${d.deliveryType}
*Prazo Estimado*: ${d.estimatedTime}
*Pagamento*: ${d.paymentName}
*Endereço*: ${d.fullAddress}${obsBlock}
______________________________________

${itemsText}
______________________________________
*TOTAL PRODUTOS*: ${d.subtotalFormatted}
*TAXA DE ENTREGA*: ${d.deliveryFeeFormatted}
*TOTAL FINAL*: ${d.totalFormatted}${trocoBlock}

Muito obrigado pela preferência!
_Para facilitar a entrega envie-nos a Localização Fixa do Whatsapp_

*👉Acompanhe o andamento do pedido:* ${d.statusUrl}`;
}
