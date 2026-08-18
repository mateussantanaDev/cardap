<script lang="ts">
  import Modal from '$components/Modal.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';

  export let isOpen: boolean = false;
  export let orderDetails: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    deliveryType: string;
    estimatedTime: string;
    paymentName: string;
    fullAddress: string;
    items: Array<{ name: string; qty: number; priceFormatted: string; obs?: string }>;
    subtotalFormatted: string;
    deliveryFeeFormatted: string;
    totalFormatted: string;
    statusUrl: string;
  } | null = null;

  export let onClose: () => void = () => {};
  export let onSent: () => void = () => {};

  $: formattedMessage = orderDetails ? buildMessage(orderDetails) : '';
  $: botReply = `Boa noite,\nEspanka Burguer agradece seu contato 😃\n\nConfira as ofertas exclusivas e faça seu pedido através do nosso Cardápio Digital, link abaixo: 👇🏻\n\nhttps://app.cardaperp.com.br/espanka-burguer\n\n*OBS: Realizando seu pedido pelo Cardápio Digital, seu pedido vai direto para a cozinha e é preparado mais rapidamente* 😉\n\nAgradecemos a Preferência!`;

  function buildMessage(d: NonNullable<typeof orderDetails>): string {
    const itemsBlock = d.items
      .map(i => `*${i.qty}* ${i.name} (${i.priceFormatted})${i.obs ? `\n_Obs: (${i.obs})_` : ''}`)
      .join('\n\n');

    return `*Espanka Burguer*

*PEDIDO #${d.orderId}*
*Nome*: ${d.customerName}
*WhatsApp*: ${d.customerPhone}
*Forma Entrega*: ${d.deliveryType}
*Prazo Estimado*: ${d.estimatedTime}
*Pagamento*: ${d.paymentName}
*Endereço*: ${d.fullAddress}
______________________________________

${itemsBlock}
______________________________________
*TOTAL PRODUTOS*: ${d.subtotalFormatted}
*TAXA DE ENTREGA*: ${d.deliveryFeeFormatted}
*TOTAL FINAL*: ${d.totalFormatted}

Muito obrigado pela preferência!
_Para facilitar a entrega envie-nos a Localização Fixa do Whatsapp_

*👉Acompanhe o andamento do pedido:* ${d.statusUrl}`;
  }

  function handleSendWhatsApp() {
    if (!formattedMessage) return;
    const phone = '5587996410495';
    const encoded = encodeURIComponent(formattedMessage);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    onSent();
  }
</script>

{#if isOpen && orderDetails}
  <Modal
    {isOpen}
    title="Enviar Pedido via WhatsApp (Evolution API)"
    subtitle="Confira a mensagem formatada antes do envio ao restaurante"
    maxWidth="md"
    {onClose}
  >
    <div class="space-y-4 font-mono text-xs">
      <div class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 font-semibold">
        📲 <strong>Evolution API Integrada:</strong> Seu pedido será formatado e enviado diretamente para o WhatsApp oficial do restaurante!
      </div>

      <!-- Preview da Mensagem Formata -->
      <div class="space-y-1.5">
        <span class="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">
          Mensagem que será enviada pelo cliente:
        </span>
        <pre class="bg-slate-900 text-emerald-400 p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 rounded-none max-h-60 whitespace-pre-wrap">{formattedMessage}</pre>
      </div>

      <!-- Preview da Resposta Automática do Bot Evolution -->
      <div class="space-y-1.5">
        <span class="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">
          Resposta Automática do Bot Evolution API (CRM):
        </span>
        <pre class="bg-slate-100 text-slate-800 p-3 font-mono text-[10px] leading-relaxed border border-slate-300 rounded-none whitespace-pre-wrap">{botReply}</pre>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <PrimaryButton variant="secondary" on:click={onClose}>Cancelar</PrimaryButton>
      <PrimaryButton variant="primary" shortcut="↵" on:click={handleSendWhatsApp}>
        <Icon name="delivery" size={14} className="mr-1" />
        Enviar Pedido no WhatsApp
      </PrimaryButton>
    </svelte:fragment>
  </Modal>
{/if}
