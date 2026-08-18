<script lang="ts">
  import Modal from '$ui/Modal.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Icon from '$components/Icon.svelte';
  import { PrinterService } from '$services/printerService';

  export let isOpen: boolean = false;
  export let order: {
    orderNumber: number | string;
    type: 'SALAO' | 'BALCAO' | 'DELIVERY';
    status: string;
    tableNumber?: number | string;
    totalAmountFormatted: string;
    items?: Array<{ name: string; qty: number; priceFormatted: string }>;
  } | null = null;

  export let onClose: () => void = () => {};
  export let onPaymentDone: () => void = () => {};

  let receiptText = '';
  let showReceipt = false;

  $: if (order) {
    showReceipt = false;
  }

  function handlePrintReceipt() {
    if (!order) return;
    receiptText = PrinterService.generateReceiptText({
      orderNumber: Number(order.orderNumber) || 104,
      type: order.type || 'SALAO',
      status: order.status || 'PRONTO',
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      subtotalFormatted: order.totalAmountFormatted,
      deliveryFeeFormatted: 'R$ 0,00',
      discountFormatted: 'R$ 0,00',
      totalAmountFormatted: order.totalAmountFormatted,
      createdAt: new Date(),
      items: (order.items || [
        { name: 'Pastel de Carne com Queijo', qty: 2, priceFormatted: 'R$ 37,00' },
        { name: 'Caldo de Cana Natural 500ml', qty: 2, priceFormatted: 'R$ 24,00' }
      ]).map(i => ({
        productName: i.name,
        quantity: i.qty,
        unitPriceFormatted: i.priceFormatted,
        totalPriceFormatted: i.priceFormatted
      }))
    });
    showReceipt = true;
  }
</script>

{#if isOpen && order}
  <Modal
    {isOpen}
    title={`Comanda #${order.orderNumber} — ${order.type}`}
    subtitle={order.tableNumber ? `Mesa ${order.tableNumber} (Salão)` : 'Atendimento Balcão / Delivery'}
    maxWidth="lg"
    {onClose}
  >
    {#if !showReceipt}
      <div class="space-y-4 font-mono text-xs text-slate-900">
        <div class="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-bold uppercase text-slate-600">Status Atual:</span>
            <StatusBadge status={order.status} />
          </div>
          <span class="font-extrabold text-red-600 text-sm">{order.totalAmountFormatted}</span>
        </div>

        <div>
          <span class="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">
            Itens Lançados na Comanda:
          </span>
          <div class="divide-y divide-slate-100 border border-slate-200 bg-white">
            {#each order.items || [
              { name: 'Pastel de Carne com Queijo', qty: 2, priceFormatted: 'R$ 37,00' },
              { name: 'Caldo de Cana Natural 500ml', qty: 2, priceFormatted: 'R$ 24,00' }
            ] as item}
              <div class="p-2.5 flex items-center justify-between">
                <span class="font-bold">{item.qty}x {item.name}</span>
                <span class="text-slate-700">{item.priceFormatted}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Icon name="printer" size={16} className="text-slate-600" />
          Buffer da Impressora Térmica (ESC/POS)
        </span>
        <pre class="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] leading-tight overflow-x-auto border border-slate-800 rounded-none max-h-[300px]">{receiptText}</pre>
      </div>
    {/if}

    <svelte:fragment slot="footer">
      <PrimaryButton variant="secondary" on:click={onClose}>Fechar</PrimaryButton>
      {#if !showReceipt}
        <PrimaryButton variant="secondary" on:click={handlePrintReceipt}>
          <Icon name="printer" size={14} className="mr-1" />
          Imprimir Cupom
        </PrimaryButton>
        <PrimaryButton variant="primary" shortcut="F2" on:click={() => { onPaymentDone(); onClose(); }}>
          Receber / Liquidar
        </PrimaryButton>
      {:else}
        <PrimaryButton variant="primary" on:click={onClose}>
          Concluir Impressão
        </PrimaryButton>
      {/if}
    </svelte:fragment>
  </Modal>
{/if}
