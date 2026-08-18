<script lang="ts">
  import Modal from '$components/Modal.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';
  import { buildWhatsAppOrderMessage, type OrderWhatsAppMessageData } from '$lib/services/whatsappOrderFormatter';

  export let isOpen: boolean = false;
  export let orderDetails: OrderWhatsAppMessageData | null = null;
  export let restaurantWhatsApp: string = '5587998123456';

  export let onClose: () => void = () => {};
  export let onSent: () => void = () => {};

  $: formattedMessage = orderDetails ? buildWhatsAppOrderMessage(orderDetails) : '';

  function handleOpenWhatsApp() {
    if (!formattedMessage) return;
    let cleanPhone = (restaurantWhatsApp || '').replace(/\D/g, '');
    if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    const encoded = encodeURIComponent(formattedMessage);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    
    // Abre a conversa com o WhatsApp oficial do restaurante
    window.open(waUrl, '_blank');
    onSent();
  }
</script>

{#if isOpen && orderDetails}
  <Modal
    {isOpen}
    title="Finalizar Pedido no WhatsApp"
    subtitle="Envie o pedido para abrir a conversa com o restaurante"
    maxWidth="md"
    {onClose}
  >
    <div class="space-y-4 font-mono text-xs">
      <div class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 font-semibold flex items-center gap-2">
        <Icon name="check" size={16} className="text-emerald-700 shrink-0" />
        <span>
          <strong>Pedido Registrado!</strong> Ao clicar no botão abaixo, o WhatsApp do restaurante será aberto com o resumo do seu pedido pronto para envio.
        </span>
      </div>

      <!-- Preview da Mensagem Formatada -->
      <div class="space-y-1.5">
        <span class="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">
          Mensagem que será enviada:
        </span>
        <pre class="bg-slate-900 text-emerald-400 p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 rounded-none max-h-64 whitespace-pre-wrap select-all">{formattedMessage}</pre>
      </div>

      <div class="p-2.5 bg-slate-100 border border-slate-300 text-slate-600 text-[10px] font-sans">
        🔒 <strong>Anti-Ban Seguro:</strong> O envio é iniciado por você, garantindo resposta rápida do robô e acompanhamento em tempo real.
      </div>
    </div>

    <svelte:fragment slot="footer">
      <PrimaryButton variant="secondary" on:click={onClose}>Voltar</PrimaryButton>
      <PrimaryButton variant="primary" shortcut="↵" on:click={handleOpenWhatsApp}>
        <Icon name="delivery" size={14} className="mr-1" />
        Abrir no WhatsApp do Restaurante 💬
      </PrimaryButton>
    </svelte:fragment>
  </Modal>
{/if}
