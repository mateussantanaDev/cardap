<script lang="ts">
  import { onMount } from 'svelte';
  import { orderStore, type KdsOrder } from '$stores/orderStore';
  import { soundAlert } from '$lib/utils/soundAlert';
  import KdsCard from '$components/kds/KdsCard.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import ThermalPrintModal from '$ui/ThermalPrintModal.svelte';
  import Icon from '$components/Icon.svelte';

  export let data: any = {};

  let activeFilter: 'TODOS' | 'SALAO' | 'DELIVERY' | 'BALCAO' = 'TODOS';
  let botNotificationToast = '';
  let isSoundActive = true;
  let previousOrderCount = 0;
  let draggedOrderId: string | null = null;
  let dragOverColumn: 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | null = null;

  let isAutoPrintActive = false;
  let autoPrintOrder: KdsOrder | null = null;
  let isAutoPrintModalOpen = false;

  onMount(() => {
    isSoundActive = soundAlert.getStatus();
    if (typeof window !== 'undefined') {
      isAutoPrintActive = localStorage.getItem('cardap_kds_autoprint') === 'true';
    }
    if (data?.orders && data.orders.length > 0) {
      orderStore.setOrders(data.orders);
    }
  });

  function toggleAutoPrint() {
    isAutoPrintActive = !isAutoPrintActive;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cardap_kds_autoprint', String(isAutoPrintActive));
    }
  }

  function triggerAutoPrint(order: KdsOrder) {
    if (!isAutoPrintActive) return;
    autoPrintOrder = order;
    isAutoPrintModalOpen = true;
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.print();
        setTimeout(() => isAutoPrintModalOpen = false, 1500);
      }
    }, 400);
  }

  $: receivedOrders = $orderStore.filter(
    (o: KdsOrder) => (o.status === 'RECEBIDO' || o.status === 'PENDENTE') && (activeFilter === 'TODOS' || o.type === activeFilter)
  );

  $: inPrepOrders = $orderStore.filter(
    (o: KdsOrder) => o.status === 'EM_PREPARO' && (activeFilter === 'TODOS' || o.type === activeFilter)
  );

  $: readyOrders = $orderStore.filter(
    (o: KdsOrder) => o.status === 'PRONTO' && (activeFilter === 'TODOS' || o.type === activeFilter)
  );

  $: totalActive = receivedOrders.length + inPrepOrders.length;
  $: delayedCount = $orderStore.filter((o: KdsOrder) => {
    const elapsedMins = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60);
    return o.status !== 'PRONTO' && o.status !== 'ENTREGUE' && elapsedMins >= o.slaMinutes;
  }).length;

  function handleDeliveryReady(event: CustomEvent<{ order: KdsOrder }>) {
    const order = event.detail.order;
    botNotificationToast = `📲 Bot Evolution API: Mensagem "Pedido #${order.orderNumber} Pronto & Saiu para Entrega" enviada com sucesso no WhatsApp do cliente!`;
    setTimeout(() => botNotificationToast = '', 6000);
  }

  async function loadKdsQueue() {
    try {
      const res = await fetch('/api/kds', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orders) {
          if (previousOrderCount > 0 && data.orders.length > previousOrderCount) {
            soundAlert.playNewOrderAlert();
            // Identificar novos pedidos e disparar auto-impressão
            const newOrders = data.orders.slice(previousOrderCount);
            if (newOrders.length > 0 && isAutoPrintActive) {
              triggerAutoPrint(newOrders[0]);
            }
          }
          previousOrderCount = data.orders.length;
          orderStore.setOrders(data.orders);
        }
      } else if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar fila do KDS:', e);
    }
  }

  function toggleSound() {
    isSoundActive = soundAlert.toggle();
  }

  // --- Funções de Segurar e Arrastar (Drag and Drop) ---
  function handleCardDragStart(e: CustomEvent<{ orderId: string }>) {
    draggedOrderId = e.detail.orderId;
  }

  function handleCardDragEnd() {
    draggedOrderId = null;
    dragOverColumn = null;
  }

  function handleDragOver(e: DragEvent, column: 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO') {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dragOverColumn = column;
  }

  function handleDragLeave(column: 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO') {
    if (dragOverColumn === column) {
      dragOverColumn = null;
    }
  }

  async function handleDrop(e: DragEvent, targetStatus: 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO') {
    e.preventDefault();
    dragOverColumn = null;
    const orderId = e.dataTransfer?.getData('text/plain') || draggedOrderId;
    draggedOrderId = null;

    if (!orderId) return;

    const existingOrder = $orderStore.find(o => o.id === orderId);
    if (!existingOrder || existingOrder.status === targetStatus) return;

    const previousStatus = existingOrder.status;

    // Atualização otimista imediata na interface
    orderStore.updateStatus(orderId, targetStatus);

    if (targetStatus === 'PRONTO' && existingOrder.type === 'DELIVERY') {
      botNotificationToast = `📲 Bot Evolution API: Mensagem "Pedido #${existingOrder.orderNumber} Pronto & Saiu para Entrega" enviada!`;
      setTimeout(() => botNotificationToast = '', 6000);
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: targetStatus })
      });
      if (!res.ok) {
        console.error('Falha ao sincronizar status arrastado no servidor. Revertendo...');
        orderStore.updateStatus(orderId, previousStatus);
      }
    } catch (err) {
      console.error('Erro na requisição ao mover card:', err);
      orderStore.updateStatus(orderId, previousStatus);
    }
  }

  onMount(() => {
    loadKdsQueue();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ORDER_CREATED') {
            soundAlert.playNewOrderAlert();
            loadKdsQueue();
          } else if (payload.type === 'ORDER_STATUS_UPDATED') {
            loadKdsQueue();
          }
        } catch (e) {}
      };
    } catch (e) {}

    const interval = setInterval(loadKdsQueue, 10000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  });
</script>

<div class="h-full flex flex-col space-y-4">
  <!-- Toast Notificação do Bot Evolution API -->
  {#if botNotificationToast}
    <div class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-950 uppercase flex items-center justify-between gap-2 shadow-sm animate-bounce">
      <div class="flex items-center gap-2">
        <Icon name="check" size={18} className="text-emerald-700" />
        <span>{botNotificationToast}</span>
      </div>
      <span class="px-2 py-0.5 bg-emerald-600 text-white text-[10px] uppercase font-bold">EVOLUTION API BOT</span>
    </div>
  {/if}

  <!-- PanelHeader de Cozinha KDS Spec 2.0.0 -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Quadro Kanban KDS — Cozinha & Expedição"
      subtitle="Arraste e solte os cards entre as colunas ou use os botões rápidos de avanço"
      index="04"
    >
      <div class="flex items-center gap-2">
        <StatusBadge status="EM_PREPARO" text={`${totalActive} em fila`} />
        {#if delayedCount > 0}
          <StatusBadge status="ATRASADO" text={`${delayedCount} atrasado(s)`} />
        {/if}

        <!-- Botão de Toggle de Alerta Sonoro -->
        <button
          type="button"
          on:click={toggleSound}
          class="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer flex items-center gap-1.5 {isSoundActive ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}"
          title={isSoundActive ? 'Alerta sonoro de novos pedidos ativado' : 'Alerta sonoro silenciado'}
        >
          <Icon name="bell" size={13} className={isSoundActive ? 'text-amber-700' : 'text-slate-400'} />
          <span>{isSoundActive ? 'Som Ligado' : 'Mudo'}</span>
        </button>

        <!-- Botão de Toggle de Auto-Impressão Térmica -->
        <button
          type="button"
          on:click={toggleAutoPrint}
          class="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer flex items-center gap-1.5 {isAutoPrintActive ? 'bg-emerald-100 text-emerald-950 border-emerald-500 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}"
          title={isAutoPrintActive ? 'Impressão automática de novas comandas ativada' : 'Impressão automática desativada'}
        >
          <Icon name="printer" size={13} className={isAutoPrintActive ? 'text-emerald-700' : 'text-slate-400'} />
          <span>{isAutoPrintActive ? 'Auto-Print ON' : 'Auto-Print OFF'}</span>
        </button>
      </div>

      <!-- Filtros por Canal Spec 2.0.0 (red-600 active) -->
      <div class="flex items-center gap-1.5 ml-4">
        <button
          class="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer {activeFilter === 'TODOS' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
          on:click={() => activeFilter = 'TODOS'}
        >
          Todos ({$orderStore.length})
        </button>
        <button
          class="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer {activeFilter === 'SALAO' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
          on:click={() => activeFilter = 'SALAO'}
        >
          Salão
        </button>
        <button
          class="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer {activeFilter === 'DELIVERY' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
          on:click={() => activeFilter = 'DELIVERY'}
        >
          Delivery
        </button>
        <button
          class="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer {activeFilter === 'BALCAO' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
          on:click={() => activeFilter = 'BALCAO'}
        >
          Balcão
        </button>
      </div>
    </PanelHeader>
  </div>

  <!-- Layout Kanban 3 Colunas Horizontal com Drag & Drop Nativo -->
  <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-hidden">
    <!-- Coluna 1: RECEBIDOS / FILA -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="border flex flex-col min-h-0 transition-colors duration-200 {dragOverColumn === 'RECEBIDO'
        ? 'bg-slate-200 border-2 border-dashed border-slate-800 shadow-inner'
        : 'bg-slate-100 border-slate-300'}"
      on:dragover={(e) => handleDragOver(e, 'RECEBIDO')}
      on:dragleave={() => handleDragLeave('RECEBIDO')}
      on:drop={(e) => handleDrop(e, 'RECEBIDO')}
    >
      <div class="p-3 bg-slate-900 text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-between border-b border-slate-950">
        <span class="flex items-center gap-1.5">
          <Icon name="orders" size={14} className="text-slate-400" />
          1. Recebidos / Fila ({receivedOrders.length})
        </span>
        <span class="text-[10px] text-slate-400">Solte para Fila</span>
      </div>

      <div class="p-3 overflow-y-auto space-y-3 flex-1">
        {#each receivedOrders as order (order.id)}
          <KdsCard
            {order}
            on:deliveryReady={handleDeliveryReady}
            on:cardDragStart={handleCardDragStart}
            on:cardDragEnd={handleCardDragEnd}
          />
        {:else}
          <div class="p-8 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-300 bg-white">
            {dragOverColumn === 'RECEBIDO' ? 'Solte aqui para mover para a Fila' : 'Nenhum pedido pendente na fila'}
          </div>
        {/each}
      </div>
    </div>

    <!-- Coluna 2: EM PREPARO -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="border flex flex-col min-h-0 transition-colors duration-200 {dragOverColumn === 'EM_PREPARO'
        ? 'bg-amber-100 border-2 border-dashed border-amber-600 shadow-inner'
        : 'bg-slate-100 border-slate-300'}"
      on:dragover={(e) => handleDragOver(e, 'EM_PREPARO')}
      on:dragleave={() => handleDragLeave('EM_PREPARO')}
      on:drop={(e) => handleDrop(e, 'EM_PREPARO')}
    >
      <div class="p-3 bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-between border-b border-amber-700">
        <span class="flex items-center gap-1.5">
          <Icon name="fire" size={14} className="text-amber-200" />
          2. Em Preparo ({inPrepOrders.length})
        </span>
        <span class="text-[10px] text-amber-100">Solte para Iniciar</span>
      </div>

      <div class="p-3 overflow-y-auto space-y-3 flex-1">
        {#each inPrepOrders as order (order.id)}
          <KdsCard
            {order}
            on:deliveryReady={handleDeliveryReady}
            on:cardDragStart={handleCardDragStart}
            on:cardDragEnd={handleCardDragEnd}
          />
        {:else}
          <div class="p-8 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-300 bg-white">
            {dragOverColumn === 'EM_PREPARO' ? 'Solte aqui para Iniciar Preparo' : 'Nenhum pedido sendo preparado no momento'}
          </div>
        {/each}
      </div>
    </div>

    <!-- Coluna 3: PRONTOS / EXPEDIÇÃO -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="border flex flex-col min-h-0 transition-colors duration-200 {dragOverColumn === 'PRONTO'
        ? 'bg-emerald-100 border-2 border-dashed border-emerald-700 shadow-inner'
        : 'bg-slate-100 border-slate-300'}"
      on:dragover={(e) => handleDragOver(e, 'PRONTO')}
      on:dragleave={() => handleDragLeave('PRONTO')}
      on:drop={(e) => handleDrop(e, 'PRONTO')}
    >
      <div class="p-3 bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-between border-b border-emerald-800">
        <span class="flex items-center gap-1.5">
          <Icon name="check" size={14} className="text-emerald-200" />
          3. Prontos / Expedição ({readyOrders.length})
        </span>
        <span class="text-[10px] text-emerald-100">Solte para Finalizar</span>
      </div>

      <div class="p-3 overflow-y-auto space-y-3 flex-1">
        {#each readyOrders as order (order.id)}
          <KdsCard
            {order}
            on:deliveryReady={handleDeliveryReady}
            on:cardDragStart={handleCardDragStart}
            on:cardDragEnd={handleCardDragEnd}
          />
        {:else}
          <div class="p-8 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-300 bg-white">
            {dragOverColumn === 'PRONTO' ? 'Solte aqui para Marcar Pronto' : 'Nenhum pedido pronto para entrega'}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- Modal de Impressão Térmica Automática para Novos Pedidos -->
{#if isAutoPrintModalOpen && autoPrintOrder}
  <ThermalPrintModal
    isOpen={isAutoPrintModalOpen}
    onClose={() => isAutoPrintModalOpen = false}
    order={autoPrintOrder}
  />
{/if}


