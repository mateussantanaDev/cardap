<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { orderStore, type KdsOrder } from '$stores/orderStore';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import Icon from '$components/Icon.svelte';

  // Modais de Ação
  import ModalComandaDetails from '$components/comanda/ModalComandaDetails.svelte';
  import ModalSangria from '$components/caixa/ModalSangria.svelte';
  import ModalSuprimento from '$components/caixa/ModalSuprimento.svelte';
  import ModalFechamentoCego from '$components/caixa/ModalFechamentoCego.svelte';
  import ModalDailyClosingReport from '$components/ui/ModalDailyClosingReport.svelte';

  export let data: any = {};

  let selectedOrder: any = null;
  let isComandaModalOpen = false;
  let isSangriaModalOpen = false;
  let isSuprimentoModalOpen = false;
  let isFechamentoModalOpen = false;
  let isReportModalOpen = false;

  let refreshToast = false;
  let sangriasAmountFormatted = 'R$ 0,00';
  let sangriasCount = 0;
  let activeShiftId = '';
  let expectedDrawerCashCents = 0;
  let dashboardStats: any = null;

  async function loadDashboardData() {
    try {
      // 1. Carregar Estatísticas Consolidadas do Dia e Pedidos
      const resStats = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (resStats.ok) {
        const json = await resStats.json();
        if (json.success && json.stats) {
          dashboardStats = json.stats;
          if (json.orders && json.orders.length > 0) {
            orderStore.setOrders(json.orders);
          }
        }
      }

      // 2. Carregar Métricas do Turno do Caixa
      const resCash = await fetch('/api/cash/current', { credentials: 'include' });
      if (resCash.ok) {
        const cashData = await resCash.json();
        if (cashData.success && cashData.isOpen && cashData.shift) {
          activeShiftId = cashData.shift.id;
          sangriasAmountFormatted = cashData.shift.totalSangriasFormatted || 'R$ 0,00';
          sangriasCount = cashData.shift.transactions?.filter((t: any) => t.type === 'SANGRIA').length || 0;
          expectedDrawerCashCents = cashData.shift.currentDrawerBalanceCents || 0;
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar dashboard:', e);
    }
  }

  function handleRefresh() {
    loadDashboardData();
    refreshToast = true;
    setTimeout(() => refreshToast = false, 3000);
  }

  function handleOpenOrder(ord: any) {
    selectedOrder = ord;
    isComandaModalOpen = true;
  }

  onMount(() => {
    if (data?.orders && data.orders.length > 0) {
      orderStore.setOrders(data.orders);
    }
    if (data?.initialMetrics) {
      dashboardStats = {
        totalSalesCents: data.initialMetrics.totalRevenueCents,
        totalSalesFormatted: `R$ ${(data.initialMetrics.totalRevenueCents / 100).toFixed(2).replace('.', ',')}`,
        openOrdersCount: data.initialMetrics.openCount,
        kitchenOrdersCount: data.initialMetrics.kitchenCount,
        averageTicketFormatted: `R$ ${(data.initialMetrics.averageTicketCents / 100).toFixed(2).replace('.', ',')}`,
        totalOrdersCount: (data.orders || []).length
      };
    }

    loadDashboardData();

    // Conexão SSE para Atualização em Tempo Real do Faturamento do Dia
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ORDER_CREATED' || payload.type === 'ORDER_STATUS_UPDATED' || payload.type === 'CASH_MOVEMENT_CREATED') {
            loadDashboardData();
          }
        } catch (e) {}
      };
    } catch (e) {}

    const interval = setInterval(loadDashboardData, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  });

  $: orders = $orderStore.length > 0 ? $orderStore : (data?.orders || []);
  $: openOrders = orders.filter((o: any) => o.status !== 'ENTREGUE' && o.status !== 'CANCELADO');
  $: kitchenOrders = orders.filter((o: any) => o.status === 'EM_PREPARO' || o.status === 'RECEBIDO');

  // Faturamento calculado dinamicamente ou do endpoint consolidado
  $: displayRevenue = dashboardStats?.totalSalesFormatted || (() => {
    const totalCents = orders.filter((o: any) => o.status !== 'CANCELADO').reduce((sum: number, o: any) => {
      if (o.totalAmountCents !== undefined && o.totalAmountCents > 0) return sum + o.totalAmountCents;
      if (o.totalAmount) return sum + Math.round(Number(o.totalAmount) * 100);
      return sum;
    }, 0);
    return `R$ ${(totalCents / 100).toFixed(2).replace('.', ',')}`;
  })();

  $: displayOpenCount = dashboardStats?.openOrdersCount ?? openOrders.length;
  $: displayKitchenCount = dashboardStats?.kitchenOrdersCount ?? kitchenOrders.length;
  $: displayAverageTicket = dashboardStats?.averageTicketFormatted || (() => {
    const validOrders = orders.filter((o: any) => o.status !== 'CANCELADO');
    if (validOrders.length === 0) return 'R$ 0,00';
    const totalCents = validOrders.reduce((sum: number, o: any) => sum + (o.totalAmountCents || 0), 0);
    return `R$ ${(Math.round(totalCents / validOrders.length) / 100).toFixed(2).replace('.', ',')}`;
  })();
</script>

<div class="space-y-6">
  {#if refreshToast}
    <div class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-900 uppercase flex items-center gap-2">
      <Icon name="check" size={16} className="text-emerald-700" />
      <span>Métricas e comandas atualizadas com sucesso!</span>
    </div>
  {/if}

  <!-- PanelHeader Padronizado do Design System v2.0.0 (Regra 70/20/10) -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Cockpit Operacional — Visão Geral"
      subtitle="Métricas financeiras, faturamento do dia e status do salão em tempo real"
      index="01"
    >
      <PrimaryButton variant="secondary" shortcut="ESC" on:click={handleRefresh}>
        <Icon name="refresh" size={14} className="mr-1" />
        Atualizar
      </PrimaryButton>

      <PrimaryButton variant="accent" shortcut="R" on:click={() => isReportModalOpen = true}>
        <Icon name="printer" size={14} className="mr-1" />
        📄 Relatório do Dia
      </PrimaryButton>

      <PrimaryButton variant="primary" shortcut="N" href="/gestao/pdv">
        <Icon name="plus" size={14} className="mr-1" />
        Nova Comanda
      </PrimaryButton>
    </PanelHeader>
  </div>

  <!-- MetricCards Grid Dinâmico -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard
      label="Faturamento do Dia"
      value={displayRevenue}
      sublabel={`${dashboardStats?.totalOrdersCount ?? orders.length} pedido(s) realizados`}
      accent="default"
    />

    <MetricCard
      label="Pedidos em Aberto"
      value={`${displayOpenCount} Pedido(s)`}
      sublabel={`${displayKitchenCount} na cozinha | ${Math.max(0, displayOpenCount - displayKitchenCount)} no salão/balcão`}
      accent="amber"
    />

    <MetricCard
      label="Ticket Médio"
      value={displayAverageTicket}
      sublabel="Média por pedido realizado"
      accent="success"
    />

    <MetricCard
      label="Sangrias do Turno"
      value={sangriasAmountFormatted}
      sublabel={`${sangriasCount} retirada(s) efetuada(s)`}
      accent="critical"
    />
  </div>

  <!-- Seção de Ações Rápidas & Tabela Densa ERP -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Tabela Densa de Pedidos Recentes -->
    <div class="lg:col-span-2 bg-white border border-slate-200 p-4">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
        <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Icon name="orders" size={16} className="text-slate-600" />
          Últimas Comandas Lançadas
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-[11px] font-mono font-bold text-red-600 hover:text-red-800 underline uppercase flex items-center gap-1 cursor-pointer"
            on:click={() => isReportModalOpen = true}
          >
            <Icon name="printer" size={13} />
            Imprimir Fechamento
          </button>
          <StatusBadge status="EM_PREPARO" text={`${displayOpenCount} em aberto`} />
        </div>
      </div>

      {#if orders.length === 0}
        <div class="p-8 border-2 border-dashed border-slate-200 text-center space-y-2 my-4">
          <div class="text-3xl">🧾</div>
          <div class="font-bold text-slate-700 text-xs font-mono uppercase">Nenhuma comanda lançada no momento</div>
          <p class="text-slate-500 font-sans text-xs max-w-sm mx-auto">
            Clique em "Nova Comanda" acima ou acesse o PDV para iniciar o atendimento.
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 font-mono text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                <th class="border-r border-slate-200 px-3 py-2">Comanda</th>
                <th class="border-r border-slate-200 px-3 py-2">Mesa / Tipo</th>
                <th class="border-r border-slate-200 px-3 py-2">Status</th>
                <th class="border-r border-slate-200 px-3 py-2">Total</th>
                <th class="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              {#each orders as ord (ord.id)}
                <tr class="hover:bg-slate-50">
                  <td class="border-r border-slate-100 px-3 py-2 font-bold text-red-600">#{ord.orderNumber}</td>
                  <td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">
                    {ord.tableNumber ? `Mesa ${String(ord.tableNumber).padStart(2, '0')} (Salão)` : ord.type}
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2"><StatusBadge status={ord.status} /></td>
                  <td class="border-r border-slate-100 px-3 py-2 font-bold text-slate-900">{ord.totalAmountFormatted}</td>
                  <td class="px-3 py-2 text-right">
                    <PrimaryButton size="sm" variant="secondary" on:click={() => handleOpenOrder(ord)}>
                      Ver
                    </PrimaryButton>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Painel de Atalhos & Caixa com Todos os Botões Operacionais -->
    <div class="bg-white border border-slate-200 p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Icon name="cash-register" size={16} className="text-slate-600" />
            Operações do Caixa
          </span>
          <StatusBadge status="PAGO" text="Caixa Ativo" />
        </div>

        <div class="space-y-2 my-4">
          <PrimaryButton variant="primary" fullWidth shortcut="F2" href="/gestao/pdv">
            Lançar Venda no PDV
          </PrimaryButton>
          <PrimaryButton variant="accent" fullWidth shortcut="F3" on:click={() => isSangriaModalOpen = true}>
            Realizar Sangria
          </PrimaryButton>
          <PrimaryButton variant="secondary" fullWidth shortcut="F4" on:click={() => isSuprimentoModalOpen = true}>
            Registrar Suprimento
          </PrimaryButton>
          <PrimaryButton variant="danger" fullWidth shortcut="F9" on:click={() => isFechamentoModalOpen = true}>
            Fechamento Cego
          </PrimaryButton>
          <PrimaryButton variant="secondary" fullWidth on:click={() => isReportModalOpen = true}>
            <Icon name="printer" size={14} className="mr-1.5" />
            Imprimir Relatório do Dia
          </PrimaryButton>
        </div>
      </div>

      <!-- Alerta Contextual -->
      <div class="border-l-4 border-slate-400 bg-slate-50 p-3 font-mono text-xs text-slate-700 flex items-start gap-2">
        <Icon name="check" size={16} className="text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <span class="font-bold uppercase tracking-wider block mb-0.5">Status do Sistema:</span>
          ERP conectado e pronto para operação.
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modais Operacionais -->
<ModalComandaDetails
  isOpen={isComandaModalOpen}
  order={selectedOrder}
  onClose={() => isComandaModalOpen = false}
  onPaymentDone={() => handleRefresh()}
/>

<ModalSangria
  isOpen={isSangriaModalOpen}
  onClose={() => isSangriaModalOpen = false}
  onConfirm={() => handleRefresh()}
/>

<ModalSuprimento
  isOpen={isSuprimentoModalOpen}
  onClose={() => isSuprimentoModalOpen = false}
  onConfirm={() => handleRefresh()}
/>

<ModalFechamentoCego
  isOpen={isFechamentoModalOpen}
  expectedCashCents={expectedDrawerCashCents}
  onClose={() => isFechamentoModalOpen = false}
  onPaymentDone={() => handleRefresh()}
/>

<!-- Modal de Impressão do Relatório de Produção e Fechamento Diário -->
<ModalDailyClosingReport
  isOpen={isReportModalOpen}
  onClose={() => isReportModalOpen = false}
  stats={dashboardStats}
/>
