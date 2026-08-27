<script lang="ts">
  import PanelHeader from '$ui/PanelHeader.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Icon from '$components/Icon.svelte';
  import ModalDailyClosingReport from '$components/ui/ModalDailyClosingReport.svelte';

  import { onMount } from 'svelte';

  export let data: any = {};

  let selectedPeriod: 'HOJE' | 'SEMANA' | 'MES' | 'CUSTOM' = 'MES';
  let startDate = '';
  let endDate = '';
  let isLoading = false;
  let isReportModalOpen = false;
  let dashboardStats: any = null;

  let totalGmv = 'R$ 0,00';
  let totalOrders = 0;
  let avgTicket = 'R$ 0,00';
  let deliveryCount = 0;

  let salesHistory: any[] = [];
  let topProducts: any[] = [];

  $: if (data?.metrics) {
    totalGmv = data.metrics.totalGmvFormatted || 'R$ 0,00';
    totalOrders = data.metrics.totalOrders || 0;
    avgTicket = data.metrics.avgTicketFormatted || 'R$ 0,00';
    deliveryCount = data.metrics.deliveryCount || 0;
  }
  $: if (data?.salesHistory) {
    salesHistory = data.salesHistory;
  }
  $: if (data?.topProducts) {
    topProducts = data.topProducts;
  }

  async function loadClosingStats() {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          dashboardStats = json.stats;
        }
      }
    } catch {}
  }

  function handleOpenClosingReport() {
    loadClosingStats();
    isReportModalOpen = true;
  }

  async function fetchReports(period: string = selectedPeriod) {
    isLoading = true;
    try {
      let url = `/api/reports?period=${period}`;
      if (period === 'CUSTOM' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          totalGmv = json.metrics.totalGmvFormatted;
          totalOrders = json.metrics.totalOrders;
          avgTicket = json.metrics.avgTicketFormatted;
          deliveryCount = json.metrics.deliveryCount;
          salesHistory = json.salesHistory || [];
          topProducts = json.topProducts || [];
        }
      }
    } catch (e) {
      console.error('Erro ao recarregar relatórios:', e);
    } finally {
      isLoading = false;
    }
  }

  function handlePeriodChange(p: 'HOJE' | 'SEMANA' | 'MES' | 'CUSTOM') {
    selectedPeriod = p;
    fetchReports(p);
  }

  onMount(() => {
    fetchReports('MES');
  });

  function handleExportCSV() {
    let url = `/api/reports/export?period=${selectedPeriod}`;
    if (selectedPeriod === 'CUSTOM' && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    window.location.href = url;
  }
</script>

<div class="space-y-6">
  <!-- PanelHeader do Módulo de Relatórios Spec 2.0.0 -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Relatórios & Histórico de Vendas (DRE)"
      subtitle="Análise de faturamento, canais de venda, curva ABC de produtos e exportação"
      index="08"
    >
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center bg-slate-100 border border-slate-300 p-0.5 font-mono text-xs">
          <button
            class="px-2.5 py-1 font-bold uppercase rounded-none transition-colors cursor-pointer {selectedPeriod === 'HOJE' ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-200'}"
            on:click={() => handlePeriodChange('HOJE')}
          >
            Hoje
          </button>
          <button
            class="px-2.5 py-1 font-bold uppercase rounded-none transition-colors cursor-pointer {selectedPeriod === 'SEMANA' ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-200'}"
            on:click={() => handlePeriodChange('SEMANA')}
          >
            Esta Semana
          </button>
          <button
            class="px-2.5 py-1 font-bold uppercase rounded-none transition-colors cursor-pointer {selectedPeriod === 'MES' ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-200'}"
            on:click={() => handlePeriodChange('MES')}
          >
            Este Mês
          </button>
        </div>

        <PrimaryButton variant="accent" on:click={handleOpenClosingReport}>
          <Icon name="printer" size={14} className="mr-1" />
          📄 Fechamento Diário
        </PrimaryButton>

        <PrimaryButton variant="primary" shortcut="Ctrl+E" on:click={handleExportCSV}>
          <Icon name="download" size={14} className="mr-1" />
          Exportar Planilha (CSV)
        </PrimaryButton>
      </div>
    </PanelHeader>
  </div>

  <!-- MetricCards Faturamento & Margens -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <MetricCard
      label="Faturamento Total"
      value={totalGmv}
      sublabel="Período selecionado"
      trend="+12.8%"
      trendDirection="up"
      accent="default"
    />

    <MetricCard
      label="Total de Comandas"
      value={`${totalOrders} Pedidos`}
      sublabel={`Ticket Médio ${avgTicket}`}
      accent="success"
    />

    <MetricCard
      label="Pedidos Delivery"
      value={`${deliveryCount} Pedidos`}
      sublabel="Pedidos via Vitrine / App"
      accent="default"
    />

    <MetricCard
      label="CMV (Custo Insumos)"
      value="30% Médio"
      sublabel="Base Ficha Técnica BOM"
      accent="amber"
    />
  </div>

  <!-- Tabela de Produtos Mais Vendidos (Curva ABC) e Histórico -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Ranking Produtos Mais Vendidos -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
        <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Icon name="tag" size={16} className="text-slate-600" />
          Curva ABC de Produtos
        </h3>
        <span class="font-mono text-[10px] text-slate-500 uppercase">TOP VENDAS</span>
      </div>

      <div class="space-y-2">
        {#each topProducts as prod, idx}
          <div class="flex items-center justify-between p-2 border border-slate-100 bg-slate-50">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-extrabold text-slate-400">#{idx + 1}</span>
              <div>
                <div class="font-bold text-xs text-slate-900">{prod.name}</div>
                <div class="font-mono text-[10px] text-slate-500">{prod.qty}</div>
              </div>
            </div>
            <div class="text-right font-mono font-bold text-xs text-slate-900">
              {prod.revenueFormatted}
            </div>
          </div>
        {/each}
        {#if topProducts.length === 0}
          <div class="p-4 text-center text-xs text-slate-500 font-mono">Nenhum produto registrado no período</div>
        {/if}
      </div>
    </div>

    <!-- Tabela Histórico de Comandas -->
    <div class="lg:col-span-2 bg-white border border-slate-200 p-4 space-y-3">
      <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
        <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Icon name="receipt" size={16} className="text-slate-600" />
          Histórico Detalhado de Comandas
        </h3>
        <span class="font-mono text-[10px] text-slate-500 uppercase">ÚLTIMAS TRANSAÇÕES</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
              <th class="border-r border-slate-200 px-3 py-2">Comanda</th>
              <th class="border-r border-slate-200 px-3 py-2">Data / Hora</th>
              <th class="border-r border-slate-200 px-3 py-2">Canal</th>
              <th class="border-r border-slate-200 px-3 py-2">Pagamento</th>
              <th class="border-r border-slate-200 px-3 py-2">Total</th>
              <th class="px-3 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each salesHistory as row}
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-red-600">{row.id}</td>
                <td class="border-r border-slate-100 px-3 py-2.5 text-slate-600">{row.date}</td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-sans font-bold text-slate-900">{row.channel}</td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-700">{row.payment}</td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-extrabold text-slate-900">{row.totalFormatted}</td>
                <td class="px-3 py-2.5 text-right">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            {/each}
            {#if salesHistory.length === 0}
              <tr>
                <td colspan="6" class="p-4 text-center text-xs text-slate-500 font-mono">Nenhum pedido finalizado no banco</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<ModalDailyClosingReport
  isOpen={isReportModalOpen}
  onClose={() => isReportModalOpen = false}
  stats={dashboardStats}
/>
