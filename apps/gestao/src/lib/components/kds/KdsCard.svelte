<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { KdsOrder } from '$stores/orderStore';
  import { orderStore } from '$stores/orderStore';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';

  export let order: KdsOrder;

  const dispatch = createEventDispatcher();

  let elapsedMinutes = 0;
  let elapsedSeconds = 0;
  let timerString = '00:00';
  let isDelayed = false;
  let timerInterval: any;

  function updateTimer() {
    const now = new Date();
    const created = new Date(order.createdAt);
    const diffMs = Math.max(0, now.getTime() - created.getTime());

    elapsedMinutes = Math.floor(diffMs / (1000 * 60));
    elapsedSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const m = String(elapsedMinutes).padStart(2, '0');
    const s = String(elapsedSeconds).padStart(2, '0');
    timerString = `${m}:${s}`;

    isDelayed = elapsedMinutes >= order.slaMinutes;
  }

  onMount(() => {
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  async function advanceStatus() {
    let nextStatus: KdsOrder['status'] = 'EM_PREPARO';
    if (order.status === 'PENDENTE' || order.status === 'RECEBIDO') {
      nextStatus = 'EM_PREPARO';
    } else if (order.status === 'EM_PREPARO') {
      nextStatus = 'PRONTO';
      if (order.type === 'DELIVERY') {
        dispatch('deliveryReady', { order });
      }
    } else if (order.status === 'PRONTO') {
      nextStatus = 'ENTREGUE';
    }

    orderStore.updateStatus(order.id, nextStatus);

    try {
      await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (e) {
      console.warn('Erro ao atualizar status do pedido no servidor:', e);
    }
  }
</script>

<div
  class="rounded-none border flex flex-col justify-between transition-all duration-200 {isDelayed
    ? 'border-2 border-red-700 bg-red-50/90 text-red-950'
    : 'border-slate-300 bg-white text-slate-900'}"
>
  <!-- Card Header -->
  <div
    class="p-3 border-b flex items-center justify-between {isDelayed
      ? 'border-red-200 bg-red-100/50'
      : 'border-slate-200 bg-slate-50'}"
  >
    <div class="flex items-center gap-2">
      <span class="font-mono text-base font-extrabold text-red-600">
        #{order.orderNumber}
      </span>
      <span class="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-slate-300 bg-white text-slate-700">
        {order.type === 'SALAO' ? `Mesa ${order.tableNumber || '?'}` : order.type}
      </span>
    </div>

    <!-- Cronômetro de SLA Vetorial em Tempo Real -->
    <div
      class="font-mono text-xs font-bold px-2 py-0.5 border flex items-center gap-1.5 {isDelayed
        ? 'bg-red-700 text-white border-red-800 animate-pulse font-extrabold'
        : 'bg-slate-100 text-slate-800 border-slate-300'}"
    >
      <Icon name="clock" size={13} className={isDelayed ? 'text-white' : 'text-slate-600'} />
      <span>{timerString}</span>
      {#if isDelayed}
        <span class="text-[9px] uppercase font-extrabold">ATRASADO</span>
      {/if}
    </div>
  </div>

  <!-- Card Body: Itens do Pedido -->
  <div class="p-3 space-y-3 font-mono text-xs flex-1">
    {#each order.items as item}
      <div class="border-b border-slate-100 pb-2 last:border-b-0">
        <div class="flex items-start justify-between font-bold text-slate-900">
          <span>{item.quantity}x {item.productName}</span>
        </div>

        <!-- Opções de Montagem -->
        {#if item.assemblies && item.assemblies.length > 0}
          <div class="mt-1 pl-2 border-l-2 border-amber-500 text-[11px] text-slate-700 space-y-0.5">
            {#each item.assemblies as opt}
              <div>• {opt.name}</div>
            {/each}
          </div>
        {/if}

        <!-- Observações Operacionais -->
        {#if item.notes}
          <div class="mt-1.5 p-1.5 bg-amber-50 border border-amber-300 text-amber-950 text-[11px] font-bold flex items-center gap-1">
            <Icon name="alert" size={13} className="text-amber-600 shrink-0" />
            <span>Obs: {item.notes}</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Card Footer: Botões de Ação do KDS -->
  <div class="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
    <div class="text-[10px] font-mono text-slate-500">
      Total: <strong class="text-slate-900">{order.totalAmountFormatted}</strong>
    </div>

    {#if order.status === 'RECEBIDO' || order.status === 'PENDENTE'}
      <PrimaryButton variant="accent" size="sm" shortcut="P" on:click={advanceStatus}>
        Iniciar Preparo
      </PrimaryButton>
    {:else if order.status === 'EM_PREPARO'}
      <PrimaryButton variant="primary" size="sm" shortcut="OK" on:click={advanceStatus}>
        Marcar Pronto
      </PrimaryButton>
    {:else if order.status === 'PRONTO'}
      <PrimaryButton variant="secondary" size="sm" on:click={advanceStatus}>
        Despachar
      </PrimaryButton>
    {/if}
  </div>
</div>
