<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { KdsOrder } from '$stores/orderStore';
  import { orderStore } from '$stores/orderStore';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import ThermalPrintModal from '$ui/ThermalPrintModal.svelte';
  import ModalComandaDetails from '$components/comanda/ModalComandaDetails.svelte';
  import Icon from '$components/Icon.svelte';

  export let order: KdsOrder;

  const dispatch = createEventDispatcher();

  let elapsedMinutes = 0;
  let elapsedSeconds = 0;
  let timerString = '00:00';
  let isDelayed = false;
  let timerInterval: any;
  let isPrintModalOpen = false;
  let isDetailsModalOpen = false;
  let isDragging = false;

  function updateTimer() {
    const now = new Date();
    const created = new Date(order.createdAt);
    const diffMs = Math.max(0, now.getTime() - created.getTime());

    elapsedMinutes = Math.floor(diffMs / (1000 * 60));
    elapsedSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const m = String(elapsedMinutes).padStart(2, '0');
    const s = String(elapsedSeconds).padStart(2, '0');
    timerString = `${m}:${s}`;

    isDelayed = elapsedMinutes >= (order.slaMinutes || 20);
  }

  onMount(() => {
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  let isUpdating = false;

  async function advanceStatus() {
    if (isUpdating) return;
    isUpdating = true;

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

    const previousStatus = order.status;
    orderStore.updateStatus(order.id, nextStatus);

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Erro ao atualizar status do pedido:', errData.error || res.statusText);
        orderStore.updateStatus(order.id, previousStatus);
      }
    } catch (e) {
      console.error('Erro ao atualizar status do pedido:', e);
      orderStore.updateStatus(order.id, previousStatus);
    } finally {
      isUpdating = false;
    }
  }

  async function handleCancelKdsOrder() {
    const reason = prompt(`Deseja cancelar o Pedido #${order.orderNumber}? Informe o motivo:`, 'Cancelado pela equipe da cozinha');
    if (!reason || reason.trim().length < 3) return;

    orderStore.updateStatus(order.id, 'CANCELADO');

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
    } catch (e) {
      console.warn('Erro ao cancelar pedido no KDS:', e);
    }
  }

  function handleDragStart(e: DragEvent) {
    isDragging = true;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', order.id);
      e.dataTransfer.effectAllowed = 'move';
    }
    dispatch('cardDragStart', { orderId: order.id });
  }

  function handleDragEnd() {
    isDragging = false;
    dispatch('cardDragEnd', { orderId: order.id });
  }
</script>

<div
  draggable="true"
  on:dragstart={handleDragStart}
  on:dragend={handleDragEnd}
  class="rounded-none border flex flex-col justify-between transition-all duration-200 cursor-grab active:cursor-grabbing select-none shadow-sm hover:shadow-md {isDragging
    ? 'opacity-40 scale-95 border-dashed border-red-500 bg-red-50'
    : isDelayed
    ? 'border-2 border-red-700 bg-red-50/90 text-red-950'
    : 'border-slate-300 bg-white text-slate-900'}"
>
  <!-- Card Header: Identificação, Canal, Total e SLA -->
  <div class="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <!-- Ícone de Grip/Arrastar -->
        <div class="text-slate-400 hover:text-slate-700 cursor-grab shrink-0" title="Arraste para mover entre colunas">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/>
            <circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/>
            <circle cx="15" cy="18" r="1.5"/>
          </svg>
        </div>

        <span class="font-mono text-base font-extrabold text-red-600">#{order.orderNumber}</span>

        <span class="font-mono text-[10px] font-bold px-2 py-0.5 border uppercase {order.type === 'DELIVERY'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : order.type === 'SALAO'
          ? 'bg-amber-50 text-amber-800 border-amber-300'
          : 'bg-emerald-50 text-emerald-800 border-emerald-300'}">
          {order.type === 'SALAO' && order.tableNumber ? `MESA ${String(order.tableNumber).padStart(2, '0')}` : order.type}
        </span>
      </div>

      <!-- Cronômetro de SLA -->
      <div
        class="font-mono text-xs font-bold px-2 py-0.5 border flex items-center gap-1 shrink-0 {isDelayed
          ? 'bg-red-700 text-white border-red-800 animate-pulse font-extrabold'
          : 'bg-slate-100 text-slate-800 border-slate-300'}"
      >
        <Icon name="clock" size={12} className={isDelayed ? 'text-white' : 'text-slate-600'} />
        <span>{timerString}</span>
        {#if isDelayed}
          <span class="text-[9px] uppercase font-extrabold">ATRASO</span>
        {/if}
      </div>
    </div>

    <!-- Linha de Cliente & Valor -->
    <div class="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-200/60">
      <div class="font-sans font-bold text-slate-800 truncate max-w-[200px]" title={order.customerName || ''}>
        👤 {order.customerName || (order.type === 'SALAO' ? 'Mesa' : 'Balcão')}
      </div>
      <div class="font-mono font-extrabold text-slate-900 shrink-0">
        {order.totalAmountFormatted}
      </div>
    </div>
  </div>

  <!-- Card Body: Itens do Pedido -->
  <div class="p-3 space-y-3 font-mono text-xs flex-1 max-h-[300px] overflow-y-auto">
    {#each order.items as item}
      <div class="border-b border-slate-100 pb-2 last:border-b-0">
        <div class="flex items-start justify-between font-bold text-slate-900">
          <span>{item.quantity}x {item.productName}</span>
        </div>

        <!-- Opções de Montagem -->
        {#if item.assemblies && item.assemblies.length > 0}
          <div class="mt-1 pl-2 border-l-2 border-amber-500 text-[11px] text-slate-700 space-y-0.5">
            {#each item.assemblies as opt}
              <div>• {typeof opt === 'string' ? opt : opt.name}</div>
            {/each}
          </div>
        {/if}

        <!-- Modificadores -->
        {#if item.modifiers && item.modifiers.length > 0}
          <div class="mt-1 pl-2 border-l-2 border-blue-500 text-[11px] text-slate-700 space-y-0.5">
            {#each item.modifiers as mod}
              <div>• {typeof mod === 'string' ? mod : mod.name}</div>
            {/each}
          </div>
        {/if}

        <!-- Complementos -->
        {#if item.complements && item.complements.length > 0}
          <div class="mt-1 pl-2 border-l-2 border-emerald-500 text-[11px] text-slate-700 space-y-0.5">
            {#each item.complements as comp}
              <div>• {typeof comp === 'string' ? comp : `${comp.quantity || 1}x ${comp.name}`}</div>
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

  <!-- Card Footer: Botões de Ação Estruturados & Sem Cortes -->
  <div class="p-2.5 border-t border-slate-200 bg-slate-50 space-y-2">
    <!-- Linha Superior de Ações: Detalhes, Impressão e Cancelamento -->
    <div class="flex items-center justify-between gap-1.5">
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <button
          type="button"
          class="flex-1 px-2 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1 truncate shadow-xs"
          on:click={() => isDetailsModalOpen = true}
          title="Ver dados do cliente, telefone, endereço e mapa de entrega"
        >
          <Icon name="user" size={12} className="text-blue-700 shrink-0" />
          <span class="truncate">Detalhes</span>
        </button>

        <button
          type="button"
          class="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-xs"
          on:click={() => isPrintModalOpen = true}
          title="Imprimir Comanda Térmica (80mm)"
        >
          <Icon name="printer" size={12} className="text-slate-700 shrink-0" />
          <span>80mm</span>
        </button>
      </div>

      <button
        type="button"
        class="p-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-300 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
        on:click={handleCancelKdsOrder}
        title="Cancelar Pedido"
      >
        <Icon name="trash" size={13} className="text-red-600" />
      </button>
    </div>

    <!-- Linha Principal de Avanço de Status (Full Width, Sem cortes) -->
    <div>
      {#if order.status === 'RECEBIDO' || order.status === 'PENDENTE'}
        <button
          type="button"
          disabled={isUpdating}
          on:click={advanceStatus}
          class="w-full py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-amber-950 font-mono text-xs font-extrabold uppercase tracking-wider border border-amber-600 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <span>▶ Iniciar Preparo</span>
        </button>
      {:else if order.status === 'EM_PREPARO'}
        <button
          type="button"
          disabled={isUpdating}
          on:click={advanceStatus}
          class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-mono text-xs font-extrabold uppercase tracking-wider border border-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <span>✓ Marcar Pronto</span>
        </button>
      {:else if order.status === 'PRONTO'}
        <button
          type="button"
          disabled={isUpdating}
          on:click={advanceStatus}
          class="w-full py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-mono text-xs font-extrabold uppercase tracking-wider border border-slate-950 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <span>🚀 Despachar / Entregue</span>
        </button>
      {/if}
    </div>
  </div>
</div>

<!-- Modal de Detalhes Completos do Pedido e Entrega -->
{#if isDetailsModalOpen}
  <ModalComandaDetails
    isOpen={isDetailsModalOpen}
    onClose={() => isDetailsModalOpen = false}
    {order}
  />
{/if}

<!-- Modal de Impressão Térmica de Comanda -->
{#if isPrintModalOpen}
  <ThermalPrintModal
    isOpen={isPrintModalOpen}
    onClose={() => isPrintModalOpen = false}
    {order}
  />
{/if}
