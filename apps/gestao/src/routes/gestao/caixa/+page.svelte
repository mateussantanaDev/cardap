<script lang="ts">
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import ModalFechamentoCego from '$components/caixa/ModalFechamentoCego.svelte';
  import ModalSangria from '$components/caixa/ModalSangria.svelte';
  import ModalSuprimento from '$components/caixa/ModalSuprimento.svelte';
  import ModalDailyClosingReport from '$components/ui/ModalDailyClosingReport.svelte';
  import Icon from '$components/Icon.svelte';

  import { onMount } from 'svelte';

  export let data: any = {};

  let modalFechamentoOpen = false;
  let modalSangriaOpen = false;
  let modalSuprimentoOpen = false;
  let modalReportOpen = false;
  let dashboardStats: any = null;

  let totalSangriasCents = 0;
  let totalSuprimentosCents = 0;

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
    modalReportOpen = true;
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  let shiftData = {
    shiftId: '',
    operatorName: 'Operador de Caixa',
    openedAt: '--:--',
    initialBalanceFormatted: 'R$ 0,00',
    totalCashSalesFormatted: 'R$ 0,00',
    totalCardSalesFormatted: 'R$ 0,00',
    totalPixSalesFormatted: 'R$ 0,00',
    totalSalesFormatted: 'R$ 0,00',
    cashSalesPercent: '0%',
    totalSangriasFormatted: 'R$ 0,00',
    totalSuprimentosFormatted: 'R$ 0,00',
    expectedDrawerCashCents: 0,
    currentDrawerBalanceFormatted: 'R$ 0,00',
    orderCount: 0
  };

  let transactions: any[] = [];

  $: if (data?.activeShift) {
    shiftData = {
      shiftId: data.activeShift.id,
      operatorName: data.activeShift.operatorName || 'Operador de Caixa (Admin)',
      openedAt: new Date(data.activeShift.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      initialBalanceFormatted: data.activeShift.initialAmountFormatted || 'R$ 0,00',
      totalCashSalesFormatted: data.activeShift.totalCashSalesFormatted || 'R$ 0,00',
      totalCardSalesFormatted: data.activeShift.totalCardSalesFormatted || 'R$ 0,00',
      totalPixSalesFormatted: data.activeShift.totalPixSalesFormatted || 'R$ 0,00',
      totalSalesFormatted: data.activeShift.totalSalesFormatted || 'R$ 0,00',
      cashSalesPercent: data.activeShift.cashSalesPercent || '0%',
      totalSangriasFormatted: data.activeShift.totalSangriasFormatted || 'R$ 0,00',
      totalSuprimentosFormatted: data.activeShift.totalSuprimentosFormatted || 'R$ 0,00',
      expectedDrawerCashCents: data.activeShift.currentDrawerBalanceCents || 0,
      currentDrawerBalanceFormatted: data.activeShift.currentDrawerBalanceFormatted || 'R$ 0,00',
      orderCount: data.activeShift.orderCount || 0
    };
  }

  $: if (data?.transactions && data.transactions.length > 0) {
    transactions = data.transactions;
  }

  async function loadCurrentShift() {
    try {
      const res = await fetch('/api/cash/current');
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.isOpen && result.shift) {
          shiftData = {
            shiftId: result.shift.id,
            operatorName: result.shift.operatorName || 'Operador de Caixa (Admin)',
            openedAt: new Date(result.shift.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            initialBalanceFormatted: result.shift.initialAmountFormatted,
            totalCashSalesFormatted: result.shift.totalCashSalesFormatted,
            totalCardSalesFormatted: result.shift.totalCardSalesFormatted,
            totalPixSalesFormatted: result.shift.totalPixSalesFormatted,
            totalSalesFormatted: result.shift.totalSalesFormatted,
            cashSalesPercent: result.shift.cashSalesPercent,
            totalSangriasFormatted: result.shift.totalSangriasFormatted,
            totalSuprimentosFormatted: result.shift.totalSuprimentosFormatted,
            expectedDrawerCashCents: result.shift.currentDrawerBalanceCents,
            currentDrawerBalanceFormatted: result.shift.currentDrawerBalanceFormatted,
            orderCount: result.shift.orderCount
          };
          totalSangriasCents = result.shift.totalSangriasCents || 0;
          totalSuprimentosCents = result.shift.totalSuprimentosCents || 0;

          if (result.shift.transactions && result.shift.transactions.length > 0) {
            transactions = result.shift.transactions.map((tx: any) => ({
              id: tx.id,
              time: new Date(tx.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              type: tx.type,
              description: tx.description,
              amountFormatted: tx.amountFormatted,
              isPositive: tx.type !== 'SANGRIA'
            }));
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar turno:', e);
    }
  }

  onMount(() => {
    loadCurrentShift();
  });

  async function handleAddSangria(amountCents: number, reason: string) {
    totalSangriasCents += amountCents;
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    transactions = [
      {
        id: `tx-${Date.now()}`,
        time: timeStr,
        type: 'SANGRIA',
        description: reason,
        amountFormatted: `- ${fmt(amountCents)}`,
        isPositive: false
      },
      ...transactions
    ];

    try {
      if (shiftData.shiftId) {
        await fetch('/api/cash/sangria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shiftId: shiftData.shiftId,
            amountCents,
            description: reason
          })
        });
        await loadCurrentShift();
      }
    } catch (e) {
      console.error('Erro ao sincronizar sangria:', e);
    }
  }

  async function handleAddSuprimento(amountCents: number, reason: string) {
    totalSuprimentosCents += amountCents;
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    transactions = [
      {
        id: `tx-${Date.now()}`,
        time: timeStr,
        type: 'SUPRIMENTO',
        description: reason,
        amountFormatted: `+ ${fmt(amountCents)}`,
        isPositive: true
      },
      ...transactions
    ];

    try {
      if (shiftData.shiftId) {
        await fetch('/api/cash/suprimento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shiftId: shiftData.shiftId,
            amountCents,
            description: reason
          })
        });
        await loadCurrentShift();
      }
    } catch (e) {
      console.error('Erro ao sincronizar suprimento:', e);
    }
  }
</script>

<div class="space-y-6">
  <!-- PanelHeader de Gestão de Caixa Spec 2.0.0 -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Gestão de Turno de Caixa — Operacional"
      subtitle="Controle de fluxo de caixa em tempo real, sangrias e auditoria cega de encerramento"
      index="02"
    >
      <StatusBadge status="PAGO" text="TURNO ABERTO" />
      <PrimaryButton variant="accent" on:click={handleOpenClosingReport}>
        <Icon name="printer" size={14} className="mr-1" />
        📄 Relatório do Dia
      </PrimaryButton>
      <PrimaryButton variant="danger" shortcut="F9" on:click={() => modalFechamentoOpen = true}>
        <Icon name="lock" size={14} className="mr-1" />
        Encerrar & Auditar Turno (Cego)
      </PrimaryButton>
    </PanelHeader>
  </div>

  <!-- Métricas do Caixa Regra 70/20/10 -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard
      label="Saldo Inicial (Troco)"
      value={shiftData.initialBalanceFormatted}
      sublabel={`Aberto às ${shiftData.openedAt}`}
      accent="default"
    />

    <MetricCard
      label="Vendas em Dinheiro"
      value={shiftData.totalCashSalesFormatted}
      sublabel="Entradas físicas na gaveta"
      trend={shiftData.cashSalesPercent !== '0%' ? shiftData.cashSalesPercent : undefined}
      trendDirection="up"
      accent="success"
    />

    <MetricCard
      label="Vendas em Cartão / PIX"
      value={shiftData.totalCardSalesFormatted}
      sublabel={`PIX: ${shiftData.totalPixSalesFormatted} | Cartão: ${shiftData.totalCardSalesFormatted}`}
      accent="default"
    />

    <MetricCard
      label="Sangrias do Turno"
      value={shiftData.totalSangriasFormatted}
      sublabel="Retiradas de segurança"
      accent="critical"
    />
  </div>

  <!-- Detalhes do Turno & Extrato Operacional -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Extrato de Transações Recentes -->
    <div class="lg:col-span-2 bg-white border border-slate-200 p-4 space-y-3">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Icon name="clipboard" size={16} className="text-slate-600" />
          Extrato de Movimentações do Turno
        </span>
        <span class="font-mono text-[10px] text-slate-500 uppercase">{shiftData.shiftId}</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 font-mono text-[10px] uppercase font-bold text-slate-600 tracking-widest">
              <th class="border-r border-slate-200 px-3 py-2">Hora</th>
              <th class="border-r border-slate-200 px-3 py-2">Tipo</th>
              <th class="border-r border-slate-200 px-3 py-2">Descrição / Operação</th>
              <th class="px-3 py-2 text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-mono">
            {#if transactions.length === 0}
              <tr>
                <td colspan="4" class="p-6 text-center text-slate-500 font-sans text-xs">
                  Nenhuma movimentação avulsa registrada neste turno (sangrias ou suprimentos).
                </td>
              </tr>
            {:else}
              {#each transactions as tx}
                <tr class="hover:bg-slate-50">
                  <td class="border-r border-slate-100 px-3 py-2 font-bold text-slate-600">{tx.time}</td>
                  <td class="border-r border-slate-100 px-3 py-2">
                    <span class="px-1.5 py-0.5 text-[9px] font-bold uppercase border {tx.type === 'SANGRIA' ? 'bg-red-50 text-red-700 border-red-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'}">
                      {tx.type}
                    </span>
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">{tx.description}</td>
                  <td class="px-3 py-2 text-right font-bold {tx.isPositive ? 'text-emerald-700' : 'text-red-700'}">
                    {tx.amountFormatted}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Painel Lateral de Controle de Gaveta -->
    <div class="bg-white border border-slate-200 p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Icon name="cash-register" size={16} className="text-slate-600" />
            Controle de Sangria & Troco
          </span>
          <kbd class="px-1.5 py-0.5 text-[9px] font-mono border border-slate-300 bg-slate-100 text-slate-700">F3</kbd>
        </div>

        <p class="font-sans text-xs text-slate-600 mb-4">
          Sangrias devem ser efetuadas sempre que o saldo em cédulas na gaveta ultrapassar <strong>R$ 1.000,00</strong>.
        </p>

        <div class="space-y-3">
          <PrimaryButton variant="accent" fullWidth shortcut="F3" on:click={() => modalSangriaOpen = true}>
            Realizar Sangria de Segurança
          </PrimaryButton>
          <PrimaryButton variant="secondary" fullWidth shortcut="F4" on:click={() => modalSuprimentoOpen = true}>
            Aporte / Suprimento de Troco
          </PrimaryButton>
        </div>
      </div>

      <!-- Alerta de Segurança Cego -->
      <div class="border-l-4 border-red-600 bg-slate-50 p-3 font-mono text-xs text-slate-800 flex items-start gap-2">
        <Icon name="lock" size={16} className="text-red-600 mt-0.5 shrink-0" />
        <div>
          <span class="font-bold text-red-600 uppercase tracking-wider block mb-0.5">Segurança cega:</span>
          Saldo atual estimado em gaveta: <strong>{shiftData.currentDrawerBalanceFormatted}</strong>.
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modais do Caixa -->
<ModalFechamentoCego
  isOpen={modalFechamentoOpen}
  expectedCashCents={shiftData.expectedDrawerCashCents}
  onClose={() => modalFechamentoOpen = false}
/>

<ModalSangria
  isOpen={modalSangriaOpen}
  onClose={() => modalSangriaOpen = false}
  onConfirm={handleAddSangria}
/>

<ModalSuprimento
  isOpen={modalSuprimentoOpen}
  onClose={() => modalSuprimentoOpen = false}
  onConfirm={handleAddSuprimento}
/>

<ModalDailyClosingReport
  isOpen={modalReportOpen}
  onClose={() => modalReportOpen = false}
  stats={dashboardStats}
/>
