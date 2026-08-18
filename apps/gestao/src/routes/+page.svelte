<script lang="ts">
  import { goto } from '$app/navigation';
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
      <PrimaryButton variant="primary" shortcut="N" on:click={() => goto('/gestao/pdv')}>
        <Icon name="plus" size={14} className="mr-1" />
        Nova Comanda
      </PrimaryButton>
    </PanelHeader>
  </div>

  <!-- MetricCards Grid Brutalista (10% Accent Focal red-600 no default) -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard
      label="Faturamento do Dia"
      value="R$ 4.850,00"
      sublabel="38 comandas encerradas"
      trend="+14.2%"
      trendDirection="up"
      accent="default"
    />

    <MetricCard
      label="Pedidos em Aberto"
      value="12 Pedidos"
      sublabel="4 na cozinha | 8 no salão"
      accent="amber"
    />

    <MetricCard
      label="Ticket Médio"
      value="R$ 127,63"
      sublabel="Média por mesa ocupada"
      trend="+5.1%"
      trendDirection="up"
      accent="success"
    />

    <MetricCard
      label="Sangrias do Turno"
      value="R$ 350,00"
      sublabel="2 retiradas efetuadas"
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
        <StatusBadge status="EM_PREPARO" text="4 em produção" />
      </div>

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
            <tr class="hover:bg-slate-50">
              <td class="border-r border-slate-100 px-3 py-2 font-bold text-red-600">#ord-104</td>
              <td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">Mesa 05 (Salão)</td>
              <td class="border-r border-slate-100 px-3 py-2"><StatusBadge status="EM_PREPARO" /></td>
              <td class="border-r border-slate-100 px-3 py-2 font-bold text-slate-900">R$ 84,50</td>
              <td class="px-3 py-2 text-right">
                <PrimaryButton size="sm" variant="secondary" on:click={() => handleOpenOrder({ orderNumber: '104', type: 'SALAO', status: 'EM_PREPARO', tableNumber: 5, totalAmountFormatted: 'R$ 84,50' })}>
                  Ver
                </PrimaryButton>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="border-r border-slate-100 px-3 py-2 font-bold text-red-600">#ord-103</td>
              <td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">Balcão Retirada</td>
              <td class="border-r border-slate-100 px-3 py-2"><StatusBadge status="PRONTO" /></td>
              <td class="border-r border-slate-100 px-3 py-2 font-bold text-slate-900">R$ 42,00</td>
              <td class="px-3 py-2 text-right">
                <PrimaryButton size="sm" variant="accent" on:click={() => handleOpenOrder({ orderNumber: '103', type: 'BALCAO', status: 'PRONTO', totalAmountFormatted: 'R$ 42,00' })}>
                  Pagar
                </PrimaryButton>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="border-r border-slate-100 px-3 py-2 font-bold text-red-600">#ord-102</td>
              <td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">Delivery (iFood)</td>
              <td class="border-r border-slate-100 px-3 py-2"><StatusBadge status="ENTREGUE" /></td>
              <td class="border-r border-slate-100 px-3 py-2 font-bold text-slate-900">R$ 115,90</td>
              <td class="px-3 py-2 text-right">
                <PrimaryButton size="sm" variant="secondary" on:click={() => handleOpenOrder({ orderNumber: '102', type: 'DELIVERY', status: 'ENTREGUE', totalAmountFormatted: 'R$ 115,90' })}>
                  Detalhes
                </PrimaryButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Painel de Atalhos & Caixa com Todos os Botões Operacionais -->
    <div class="bg-white border border-slate-200 p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Icon name="cash-register" size={16} className="text-slate-600" />
            Operações do Caixa
          </span>
          <StatusBadge status="PAGO" text="Caixa Aberto" />
        </div>

        <div class="space-y-2 my-4">
          <PrimaryButton variant="primary" fullWidth shortcut="F2" on:click={() => goto('/gestao/pdv')}>
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
      <div class="border-l-4 border-amber-500 bg-amber-50 p-3 font-mono text-xs text-amber-950 flex items-start gap-2">
        <Icon name="alert" size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <span class="font-bold uppercase tracking-wider block mb-0.5">Aviso Operacional:</span>
          2 lotes de insumos vencendo em 48 horas no estoque.
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
/>
