<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PanelHeader from '$components/PanelHeader.svelte';
  import StatusBadge from '$components/StatusBadge.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import BottomBarNav from '$components/BottomBarNav.svelte';
  import TimelineStep from '$components/TimelineStep.svelte';
  import Icon from '$components/Icon.svelte';
  import { cartItemCount } from '$stores/cartStore';

  const { currentSlug } = tenantVitrineManager;

  let activeTab: 'ATIVO' | 'HISTORICO' = 'ATIVO';

  type StatusStep = 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE';

  interface UserOrderRecord {
    id: string;
    orderNumber: number;
    date: string;
    type: string;
    itemsSummary: string;
    totalCents: number;
    status: StatusStep;
  }

  let ordersList: UserOrderRecord[] = [];
  let activeOrder: UserOrderRecord | null = null;
  let currentStatus: StatusStep = 'RECEBIDO';
  let pollInterval: any;

  async function fetchLiveOrderStatus(orderId: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order && data.order.status) {
          currentStatus = data.order.status as StatusStep;
          if (activeOrder) {
            activeOrder.status = currentStatus;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao consultar status do pedido na API:', e);
    }
  }

  onMount(() => {
    try {
      const stored = localStorage.getItem('cardap_user_orders_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          ordersList = parsed;
          const firstOrder = parsed[0];
          if (firstOrder) {
            activeOrder = firstOrder;
            currentStatus = firstOrder.status || 'RECEBIDO';

            // Consultar status real na API do servidor a cada 10s
            fetchLiveOrderStatus(firstOrder.id);
            pollInterval = setInterval(() => {
              if (firstOrder.id) {
                fetchLiveOrderStatus(firstOrder.id);
              }
            }, 10000);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar histórico de pedidos do localStorage:', e);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });

  const steps: Array<{ status: StatusStep; title: string; subtitle: string; icon: string }> = [
    { status: 'RECEBIDO', title: 'PEDIDO RECEBIDO', subtitle: 'Confirmado pelo sistema Espanka Burguer e enviado para a cozinha.', icon: '1' },
    { status: 'EM_PREPARO', title: 'EM PREPARO NA CHAPA', subtitle: 'Hambúrguer artesanal sendo selado e montado no pão brioche.', icon: '2' },
    { status: 'PRONTO', title: 'SAIU PARA ENTREGA', subtitle: 'Motoboy a caminho do seu endereço no Centro.', icon: '3' },
    { status: 'ENTREGUE', title: 'PEDIDO ENTREGUE', subtitle: 'Pedido concluído com sucesso. Bom apetite!', icon: '4' }
  ];

  function getStepState(stepStatus: StatusStep): 'COMPLETED' | 'ACTIVE' | 'PENDING' {
    const orderMap: Record<StatusStep, number> = { RECEBIDO: 1, EM_PREPARO: 2, PRONTO: 3, ENTREGUE: 4 };
    const currentLevel = orderMap[currentStatus];
    const stepLevel = orderMap[stepStatus];

    if (stepLevel < currentLevel) return 'COMPLETED';
    if (stepLevel === currentLevel) return 'ACTIVE';
    return 'PENDING';
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
</script>

<div
  in:fly={{ y: 8, duration: 280, easing: cubicOut }}
  class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900 pb-16"
>
  <!-- Header Fixo da Tela -->
  <header class="bg-slate-900 text-white p-4 space-y-1 sticky top-0 z-30 border-b border-slate-800 backdrop-blur-md bg-slate-900/95">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          on:click={() => goto(`/${$currentSlug}`)}
          class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Icon name="arrow-left" size={12} />
          <span>CARDÁPIO</span>
        </button>
        <div>
          <h1 class="font-mono text-xs font-bold tracking-widest uppercase text-white leading-tight">
            MEUS PEDIDOS
          </h1>
          <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
            ACOMPANHAMENTO AO VIVO & HISTÓRICO REAL
          </span>
        </div>
      </div>
    </div>
  </header>

  <main class="p-4 space-y-5 flex-1 pb-20">
    <!-- Seletor de Abas (Pedido Ativo vs Histórico) -->
    <div class="border border-slate-200 bg-white p-1 flex gap-1 font-mono text-xs shadow-xs">
      <button
        type="button"
        on:click={() => activeTab = 'ATIVO'}
        class="flex-1 py-2 text-center uppercase tracking-wider transition-all duration-200 cursor-pointer font-bold flex items-center justify-center gap-1.5 {activeTab === 'ATIVO' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}"
      >
        <span class="h-2 w-2 rounded-none bg-red-600 animate-ping inline-block"></span>
        <span>PEDIDO ATIVO</span>
      </button>

      <button
        type="button"
        on:click={() => activeTab = 'HISTORICO'}
        class="flex-1 py-2 text-center uppercase tracking-wider transition-all duration-200 cursor-pointer font-bold flex items-center justify-center gap-1.5 {activeTab === 'HISTORICO' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}"
      >
        <Icon name="orders" size={14} />
        <span>HISTÓRICO ({ordersList.length})</span>
      </button>
    </div>

    <!-- Conteúdo da Aba Pedido Ativo -->
    {#if activeTab === 'ATIVO'}
      {#if activeOrder}
        <div in:fade={{ duration: 180 }} class="space-y-4">
          <!-- Status Card Principal -->
          <div class="border-2 border-slate-900 bg-white p-5 space-y-3 shadow-[8px_8px_0_rgba(15,23,42,0.12)]">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-red-600 uppercase">
                  PROTOCOLO #{activeOrder.id}
                </span>
              </div>
              <StatusBadge status={currentStatus} />
            </div>

            <div class="space-y-1">
              <h2 class="font-mono text-base font-bold text-slate-900 uppercase">
                {steps.find(s => s.status === currentStatus)?.title || 'PEDIDO EM ANDAMENTO'}
              </h2>
              <p class="text-xs text-slate-600 font-sans leading-relaxed">
                {steps.find(s => s.status === currentStatus)?.subtitle || 'Seu pedido foi registrado no sistema e está sendo processado.'}
              </p>
            </div>

            <div class="pt-2 border-t border-slate-200 flex items-center justify-between font-mono text-[10px] text-slate-500">
              <span>PREV. ENTREGA: 15-30 MIN</span>
              <span class="font-bold text-slate-900">VALOR: {fmt(activeOrder.totalCents)}</span>
            </div>
          </div>

          <!-- Linha do Tempo Vertical de Produção KDS -->
          <div class="border border-slate-200 bg-white">
            <PanelHeader
              title="Produção em Tempo Real"
              subtitle="Progresso do pedido consultado diretamente no servidor"
              index="01"
            />

            <div class="p-5">
              <ol class="space-y-0">
                {#each steps as step, i}
                  <TimelineStep
                    titulo={step.title}
                    descricao={step.subtitle}
                    state={getStepState(step.status)}
                    icon={step.icon}
                    isLast={i === steps.length - 1}
                  />
                {/each}
              </ol>
            </div>
          </div>
        </div>
      {:else}
        <!-- Sem Pedidos Ativos Realizados -->
        <div in:fade={{ duration: 180 }} class="border border-slate-200 bg-white p-8 text-center space-y-3 font-mono text-xs">
          <div class="w-12 h-12 bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
            <Icon name="orders" size={24} />
          </div>
          <h3 class="font-bold text-slate-900 uppercase">NENHUM PEDIDO ATIVO NO MOMENTO</h3>
          <p class="text-slate-500 font-sans text-xs max-w-xs mx-auto">
            Você ainda não possui pedidos em andamento no servidor. Monte sua sacola e faça seu primeiro pedido!
          </p>
          <div class="pt-2">
            <PrimaryButton
              label="IR PARA O CARDÁPIO"
              variant="primary"
              shortcut="↵"
              on:click={() => goto('/')}
            />
          </div>
        </div>
      {/if}
    {:else}
      <!-- Conteúdo da Aba Histórico de Pedidos Realizados no Servidor -->
      <div in:fade={{ duration: 180 }} class="border border-slate-200 bg-white divide-y divide-slate-100">
        <PanelHeader
          title="Histórico de Pedidos Realizados"
          subtitle="Consulte suas compras anteriores armazenadas no sistema"
          index="01"
        />

        {#if ordersList.length > 0}
          {#each ordersList as po}
            <div class="p-4 space-y-2 hover:bg-slate-50 transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 font-mono text-xs font-bold text-slate-900">
                  <span>#{po.id}</span>
                  <span class="text-slate-400">·</span>
                  <span class="text-slate-500 font-normal text-[11px]">{po.date}</span>
                </div>
                <StatusBadge status={po.status} />
              </div>

              <p class="text-xs text-slate-600 font-sans leading-relaxed">
                {po.itemsSummary}
              </p>

              <div class="pt-2 flex items-center justify-between font-mono text-xs border-t border-slate-100">
                <span class="font-bold text-slate-900">{fmt(po.totalCents)}</span>

                <button
                  type="button"
                  on:click={() => goto('/')}
                  class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  PEDIR NOVAMENTE
                </button>
              </div>
            </div>
          {/each}
        {:else}
          <div class="p-8 text-center space-y-2 font-mono text-xs text-slate-500">
            <p>Nenhum pedido anterior encontrado no seu histórico.</p>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <!-- Rodapé Fixo de Navegação -->
  <div class="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50">
    <BottomBarNav
      activeTab="pedidos"
      cartCount={$cartItemCount}
    />
  </div>
</div>
