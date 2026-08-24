<script lang="ts">
  import Modal from '$components/Modal.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import StatusBadge from '$components/StatusBadge.svelte';
  import Icon from '$components/Icon.svelte';
  import { tableSessionStore, tableNumber, comandaTotalFormatted } from '$stores/tableSessionStore';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};

  let liveItems: Array<{ id?: string; orderId: string; name: string; qty: number; priceFormatted: string; itemTotalCents: number; notes?: string; status: string }> = [];
  let liveTotalFormatted = '';
  let isLoading = false;
  let cancelFeedback = '';
  let cancellingOrderId: string | null = null;
  let syncInterval: any = null;

  async function syncTableComanda() {
    if (!$tableNumber) return;
    try {
      const res = await fetch(`/api/orders?tableNumber=${$tableNumber}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          liveItems = data.items || [];
          liveTotalFormatted = data.totalFormatted || 'R$ 0,00';
          tableSessionStore.updateComanda(
            liveItems.map(i => ({ name: i.name, qty: i.qty, priceFormatted: i.priceFormatted, notes: i.notes })),
            data.totalCents || 0
          );
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar comanda da mesa:', e);
    }
  }

  $: if (isOpen && $tableNumber) {
    syncTableComanda();
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(syncTableComanda, 5000);
  } else if (!isOpen && syncInterval) {
    clearInterval(syncInterval);
  }

  async function handleCancelItem(item: any) {
    if (!item.orderId) return;
    if (!confirm(`Deseja cancelar o item "${item.name}" da sua comanda?`)) return;

    cancellingOrderId = item.orderId;
    cancelFeedback = '';

    try {
      const res = await fetch(`/api/orders/${item.orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado pelo cliente na comanda digital' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        cancelFeedback = `✅ Item cancelado com sucesso.`;
        await syncTableComanda();
        setTimeout(() => cancelFeedback = '', 4000);
      } else {
        alert(data.error || 'Não foi possível cancelar este item.');
      }
    } catch (e: any) {
      alert(`Erro ao cancelar item: ${e.message}`);
    } finally {
      cancellingOrderId = null;
    }
  }
</script>

{#if isOpen}
  <Modal
    {isOpen}
    title={`Comanda Digital — Mesa ${$tableNumber || ''}`}
    subtitle="Consumo presencial registrado em tempo real nesta mesa"
    maxWidth="md"
    {onClose}
  >
    <div class="space-y-4 font-mono text-xs text-slate-900">
      {#if cancelFeedback}
        <div class="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs">
          {cancelFeedback}
        </div>
      {/if}

      <!-- Header do Consumo da Mesa -->
      <div class="p-3 bg-amber-50 border border-amber-300 flex items-center justify-between">
        <div>
          <span class="text-[10px] text-amber-800 uppercase font-bold block">Status da Mesa:</span>
          <span class="font-extrabold text-slate-900 text-sm">MESA {$tableNumber} (ATIVA)</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-500 uppercase font-bold block">Subtotal Lançado:</span>
          <span class="font-extrabold text-red-600 text-base">{liveTotalFormatted || $comandaTotalFormatted}</span>
        </div>
      </div>

      <!-- Lista de Itens da Comanda -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
            Itens Lançados nesta Comanda:
          </span>
          <button
            type="button"
            class="text-[10px] text-slate-600 hover:text-slate-900 font-bold cursor-pointer flex items-center gap-1"
            on:click={syncTableComanda}
          >
            <Icon name="refresh" size={11} />
            <span>Atualizar</span>
          </button>
        </div>

        {#if liveItems.length === 0 && (!$tableSessionStore.comandaItems || $tableSessionStore.comandaItems.length === 0)}
          <div class="p-6 border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-1.5">
            <div class="text-2xl">🍽️</div>
            <div class="font-bold text-slate-800">Nenhum pedido enviado ainda</div>
            <p class="text-slate-500 font-sans text-xs">
              Adicione pratos ou bebidas do cardápio à sacola e finalize para lançar na comanda desta mesa.
            </p>
          </div>
        {:else}
          <div class="divide-y divide-slate-100 border border-slate-200 bg-white max-h-[320px] overflow-y-auto">
            {#each (liveItems.length > 0 ? liveItems : $tableSessionStore.comandaItems) as item}
              <div class="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold">{item.qty}x {item.name}</span>
                    {#if item.status}
                      <span class="px-1.5 py-0.2 text-[9px] font-bold uppercase border {item.status === 'EM_PREPARO' ? 'bg-amber-50 text-amber-800 border-amber-300' : item.status === 'PRONTO' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'}">
                        {item.status}
                      </span>
                    {/if}
                  </div>
                  {#if item.notes}
                    <span class="block text-[10px] text-slate-500 font-sans">Obs: {item.notes}</span>
                  {/if}
                </div>

                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900">{item.priceFormatted}</span>

                  {#if item.orderId && (item.status === 'PENDENTE' || item.status === 'RECEBIDO' || !item.status)}
                    <button
                      type="button"
                      title="Cancelar este item antes do preparo"
                      class="p-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] cursor-pointer"
                      disabled={cancellingOrderId === item.orderId}
                      on:click={() => handleCancelItem(item)}
                    >
                      ✕ Cancelar
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Informação de Pagamento no Salão -->
      <div class="p-3 bg-slate-100 border border-slate-200 text-[11px] font-sans text-slate-600 space-y-1">
        <p class="font-bold text-slate-800 font-mono text-[10px] uppercase">
          💡 Como funciona o fechamento de conta?
        </p>
        <p>
          Você pode continuar adicionando itens a qualquer momento. Para solicitar a conta, basta avisar o garçom ou pedir o fechamento no balcão.
        </p>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <PrimaryButton variant="secondary" fullWidth on:click={onClose}>
        Continuar Pedindo no Cardápio
      </PrimaryButton>
    </svelte:fragment>
  </Modal>
{/if}
