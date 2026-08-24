<script lang="ts">
  import Modal from '$ui/Modal.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Icon from '$components/Icon.svelte';
  import { PrinterService } from '$services/printerService';

  export let isOpen: boolean = false;
  export let order: {
    id?: string;
    orderNumber: number | string;
    type: 'SALAO' | 'BALCAO' | 'DELIVERY';
    status: string;
    tableNumber?: number | string;
    totalAmountFormatted: string;
    items?: Array<{ name: string; qty: number; priceFormatted: string; notes?: string }>;
  } | null = null;

  export let onClose: () => void = () => {};
  export let onPaymentDone: () => void = () => {};

  let receiptText = '';
  let showReceipt = false;
  let isCancelling = false;

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
      items: (order.items && order.items.length > 0 ? order.items : [
        { name: 'Consumo Salão', qty: 1, priceFormatted: order.totalAmountFormatted }
      ]).map(i => ({
        productName: i.name,
        quantity: i.qty,
        unitPriceFormatted: i.priceFormatted,
        totalPriceFormatted: i.priceFormatted
      }))
    });
    showReceipt = true;
  }

  async function handleCancelOrder() {
    if (!order?.id && !order?.orderNumber) return;
    const reason = prompt('Informe o motivo do cancelamento do pedido:');
    if (!reason || reason.trim().length < 3) {
      alert('É necessário informar um motivo de cancelamento com no mínimo 3 caracteres.');
      return;
    }

    isCancelling = true;
    const orderIdToCancel = order.id || String(order.orderNumber);

    try {
      const res = await fetch(`/api/orders/${orderIdToCancel}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Pedido cancelado com sucesso.');
        onPaymentDone();
        onClose();
      } else {
        alert(data.error || 'Erro ao cancelar pedido.');
      }
    } catch (e: any) {
      alert(`Falha na requisição de cancelamento: ${e.message}`);
    } finally {
      isCancelling = false;
    }
  }
</script>

{#if isOpen && order}
  <Modal
    {isOpen}
    title={`Comanda #${order.orderNumber} — ${order.type}`}
    subtitle={order.tableNumber ? `Mesa ${order.tableNumber} (Salão Presencial)` : 'Atendimento Balcão / Delivery'}
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
          <div>
            <span class="text-[10px] text-slate-500 uppercase font-bold mr-1">Total:</span>
            <span class="font-extrabold text-red-600 text-sm">{order.totalAmountFormatted}</span>
          </div>
        </div>

        <div>
          <span class="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">
            Itens Lançados na Comanda:
          </span>

          {#if !order.items || order.items.length === 0}
            <div class="p-6 border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-1">
              <div class="text-slate-400 text-xl">🍽️</div>
              <div class="font-bold text-slate-700">Nenhum item lançado ainda</div>
              <p class="text-slate-500 font-sans text-xs">
                Esta mesa está aberta e aguarda pedidos do salão ou pedidos via QR Code do cardápio online.
              </p>
            </div>
          {:else}
            <div class="divide-y divide-slate-100 border border-slate-200 bg-white">
              {#each order.items as item}
                <div class="p-2.5 flex items-center justify-between">
                  <div>
                    <span class="font-bold">{item.qty}x {item.name}</span>
                    {#if item.notes}
                      <span class="block text-[10px] text-slate-500 font-sans">Obs: {item.notes}</span>
                    {/if}
                  </div>
                  <span class="text-slate-700 font-bold">{item.priceFormatted}</span>
                </div>
              {/each}
            </div>
          {/if}
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
      <div class="flex items-center justify-between w-full">
        <div>
          {#if !showReceipt && order.status !== 'CANCELADO' && order.status !== 'ENTREGUE'}
            <PrimaryButton variant="danger" size="sm" disabled={isCancelling} on:click={handleCancelOrder}>
              <Icon name="trash" size={13} className="mr-1" />
              Cancelar Pedido
            </PrimaryButton>
          {/if}
        </div>

        <div class="flex items-center gap-2">
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
        </div>
      </div>
    </svelte:fragment>
  </Modal>
{/if}
