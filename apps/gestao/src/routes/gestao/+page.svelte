<script lang="ts">
  import { goto } from '$app/navigation';
  import { orderStore } from '$stores/orderStore';
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

  let selectedOrder: any = null;
  let isComandaModalOpen = false;
  let isSangriaModalOpen = false;
  let isSuprimentoModalOpen = false;
  let isFechamentoModalOpen = false;

  let refreshToast = false;

  function handleRefresh() {
    refreshToast = true;
    setTimeout(() => refreshToast = false, 3000);
  }

  function handleOpenOrder(ord: any) {
    selectedOrder = ord;
    isComandaModalOpen = true;
  }

  $: orders = $orderStore;
  $: closedOrders = orders.filter(o => o.status === 'ENTREGUE');
  $: openOrders = orders.filter(o => o.status !== 'ENTREGUE' && o.status !== 'CANCELADO');
  $: kitchenOrders = orders.filter(o => o.status === 'EM_PREPARO' || o.status === 'RECEBIDO');
  $: totalRevenueCents = closedOrders.reduce((sum, o) => sum + (o.totalAmountCents || 0), 0);
  $: totalRevenueFormatted = `R$ ${(totalRevenueCents / 100).toFixed(2).replace('.', ',')}`;
  $: averageTicketCents = closedOrders.length > 0 ? Math.round(totalRevenueCents / closedOrders.length) : 0;
  $: averageTicketFormatted = `R$ ${(averageTicketCents / 100).toFixed(2).replace('.', ',')}`;
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
      subtitle="Métricas financeiras, produção KDS e status do salão em tempo real"
      index="01"
    >
      <PrimaryButton variant="secondary" shortcut="ESC" on:click={handleRefresh}>
        <Icon name="refresh" size={14} className="mr-1" />
        Atualizar
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
      value={totalRevenueFormatted}
      sublabel={`${closedOrders.length} comanda(s) encerrada(s)`}
      accent="default"
    />

    <MetricCard
      label="Pedidos em Aberto"
      value={`${openOrders.length} Pedido(s)`}
      sublabel={`${kitchenOrders.length} na cozinha | ${openOrders.length - kitchenOrders.length} no salão/balcão`}
      accent="amber"
    />

    <MetricCard
      label="Ticket Médio"
      value={averageTicketFormatted}
      sublabel="Média por comanda encerrada"
      accent="success"
    />

    <MetricCard
      label="Sangrias do Turno"
      value="R$ 0,00"
      sublabel="0 retiradas efetuadas"
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
        <StatusBadge status="EM_PREPARO" text={`${openOrders.length} em aberto`} />
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
  onClose={() => isFechamentoModalOpen = false}
  onPaymentDone={() => handleRefresh()}
/>
