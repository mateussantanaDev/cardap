<script lang="ts">
  import { onMount } from 'svelte';
  import { orderStore, type KdsOrder } from '$stores/orderStore';
  import { soundAlert } from '$lib/utils/soundAlert';
  import KdsCard from '$components/kds/KdsCard.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import Icon from '$components/Icon.svelte';

  export let data: any = {};

  let activeFilter: 'TODOS' | 'SALAO' | 'DELIVERY' | 'BALCAO' = 'TODOS';
  let botNotificationToast = '';
  let isSoundActive = true;
  let previousOrderCount = 0;

  onMount(() => {
    isSoundActive = soundAlert.getStatus();
    if (data?.orders && data.orders.length > 0) {
      orderStore.setOrders(data.orders);
    }
  });

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
          }
          previousOrderCount = data.orders.length;
          orderStore.setOrders(data.orders);
        }
      } else if (res.status === 401) {
        console.warn('Sessão expirada no KDS. Redirecionando para login...');
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
      title="Esteira KDS — Cozinha & Expedição"
      subtitle="Monitor de preparo de comandas e gerenciamento de SLA em tempo real"
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

  <!-- Layout Kanban 3 Colunas Horizontal -->
  <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-hidden">
    <!-- Coluna 1: RECEBIDOS -->
    <div class="bg-slate-100 border border-slate-300 flex flex-col min-h-0">
      <div class="p-3 bg-slate-900 text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-between border-b border-slate-950">
        <span class="flex items-center gap-1.5">
          <Icon name="orders" size={14} className="text-slate-400" />
          1. Recebidos / Fila ({receivedOrders.length})
        </span>
        <span class="text-[10px] text-slate-400">Aguardando Cozinha</span>
      </div>

      <div class="p-3 overflow-y-auto space-y-3 flex-1">
        {#each receivedOrders as order (order.id)}
          <KdsCard {order} on:deliveryReady={handleDeliveryReady} />
        {:else}
          <div class="p-8 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-300 bg-white">
            Nenhum pedido pendente na fila
          </div>
        {/each}
      </div>
    </div>

    <!-- Coluna 2: EM PREPARO -->
    <div class="bg-slate-100 border border-slate-300 flex flex-col min-h-0">
      <div class="p-3 bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-between border-b border-amber-700">
        <span class="flex items-center gap-1.5">
          <Icon name="fire" size={14} className="text-amber-200" />
          2. Em Preparo ({inPrepOrders.length})
        </span>
        <span class="text-[10px] text-amber-100">Em Produção</span>
      </div>

      <div class="p-3 overflow-y-auto space-y-3 flex-1">
        {#each inPrepOrders as order (order.id)}
          <KdsCard {order} on:deliveryReady={handleDeliveryReady} />
        {:else}
          <div class="p-8 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-300 bg-white">
            Nenhum pedido sendo preparado no momento
          </div>
        {/each}
      </div>
    </div>

    <!-- Coluna 3: PRONTOS / EXPEDIÇÃO -->
    <div class="bg-slate-100 border border-slate-300 flex flex-col min-h-0">
      <div class="p-3 bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-between border-b border-emerald-800">
        <span class="flex items-center gap-1.5">
          <Icon name="check" size={14} className="text-emerald-200" />
          3. Prontos / Expedição ({readyOrders.length})
        </span>
        <span class="text-[10px] text-emerald-100">Aguardando Retirada</span>
      </div>

      <div class="p-3 overflow-y-auto space-y-3 flex-1">
        {#each readyOrders as order (order.id)}
          <KdsCard {order} on:deliveryReady={handleDeliveryReady} />
        {:else}
          <div class="p-8 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-300 bg-white">
            Nenhum pedido pronto para entrega
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
