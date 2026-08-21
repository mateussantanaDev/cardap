<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PanelHeader from '$components/PanelHeader.svelte';
  import StatusBadge from '$components/StatusBadge.svelte';
  import TimelineStep from '$components/TimelineStep.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';

  export let data: any;

  let orderId = data?.orderId || $page.params.id || 'ord-101';
  let orderData = data?.order || null;
  let restaurant = data?.restaurant || {
    name: 'Restaurante Cardap',
    slug: 'loja',
    phone: '(11) 99999-9999',
    primaryColor: '#dc2626'
  };

  $: restaurantPhone = (restaurant?.phone || '11999999999').replace(/\D/g, '');
  $: cleanPhone = restaurantPhone.length <= 11 && !restaurantPhone.startsWith('55') ? `55${restaurantPhone}` : restaurantPhone;

  let orderType = orderData?.type || $page.url.searchParams.get('type') || 'DELIVERY';
  let tableNumber = orderData?.tableNumber || $page.url.searchParams.get('table') || '';

  type StatusStep = 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';
  let currentStatus: StatusStep = (orderData?.status as StatusStep) || 'RECEBIDO';
  let pollInterval: any;
  let isCancelling = false;
  let cancelMessage = '';
  let cancelError = '';

  async function fetchLiveStatus() {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.order && json.order.status) {
          currentStatus = json.order.status as StatusStep;
          if (json.order.items && json.order.items.length > 0 && !orderData?.items?.length) {
            orderData = { ...orderData, ...json.order };
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar status:', e);
    }
  }

  onMount(() => {
    fetchLiveStatus();
    pollInterval = setInterval(fetchLiveStatus, 4000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  $: steps = [
    {
      status: 'RECEBIDO',
      title: 'PEDIDO RECEBIDO',
      subtitle: `Confirmado no sistema ${restaurant.name} e encaminhado para a cozinha.`,
      icon: '1'
    },
    {
      status: 'EM_PREPARO',
      title: 'EM PREPARO NA COZINHA',
      subtitle: 'Itens em produção e montagem artesanal pela equipe.',
      icon: '2'
    },
    {
      status: 'PRONTO',
      title: orderType === 'DELIVERY' ? 'SAIU PARA ENTREGA' : (orderType === 'RETIRADA' ? 'PRONTO PARA RETIRADA' : 'PRONTO NA MESA'),
      subtitle: orderType === 'DELIVERY' ? 'Motoboy em trânsito com seu pedido.' : (orderType === 'RETIRADA' ? 'Disponível no balcão da loja para retirada.' : 'Pronto para consumo no salão.'),
      icon: '3'
    },
    {
      status: 'ENTREGUE',
      title: 'PEDIDO CONCLUÍDO',
      subtitle: 'Pedido entregue com sucesso! Muito obrigado pela preferência.',
      icon: '4'
    }
  ];

  function getStepState(stepStatus: string): 'COMPLETED' | 'ACTIVE' | 'PENDING' {
    if (currentStatus === 'CANCELADO') return 'PENDING';
    const orderMap: Record<string, number> = { RECEBIDO: 1, EM_PREPARO: 2, PRONTO: 3, ENTREGUE: 4 };
    const currentLevel = orderMap[currentStatus] || 1;
    const stepLevel = orderMap[stepStatus] || 1;

    if (stepLevel < currentLevel) return 'COMPLETED';
    if (stepLevel === currentLevel) return 'ACTIVE';
    return 'PENDING';
  }

  async function handleCancelOrder() {
    if (!confirm('Tem certeza que deseja cancelar seu pedido? Esta ação não pode ser desfeita.')) {
      return;
    }

    isCancelling = true;
    cancelError = '';
    cancelMessage = '';

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado pelo cliente na tela de status' })
      });

      const json = await res.json();
      if (json.success) {
        currentStatus = 'CANCELADO';
        cancelMessage = 'Pedido cancelado com sucesso.';
      } else {
        cancelError = json.error || 'Não foi possível cancelar o pedido.';
      }
    } catch (e: any) {
      cancelError = 'Erro ao solicitar cancelamento. Entre em contato via WhatsApp.';
    } finally {
      isCancelling = false;
    }
  }

  function handleOpenWhatsApp() {
    const text = encodeURIComponent(`Olá ${restaurant.name}, gostaria de falar sobre o meu pedido *#${orderId}*.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  }

  const fmt = (cents: number) => {
    const valid = (cents !== undefined && cents !== null && !isNaN(cents)) ? Number(cents) : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valid / 100);
  };
</script>

<div
  in:fly={{ y: 8, duration: 280, easing: cubicOut }}
  class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900 font-sans pb-16"
>
  <!-- Header Institucional -->
  <header class="bg-slate-900 text-white p-4 space-y-1 sticky top-0 z-30 border-b border-slate-800 backdrop-blur-md bg-slate-900/95">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          on:click={() => goto(`/${restaurant.slug || 'imperius-do-pastel'}`)}
          class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Icon name="arrow-left" size={12} />
          <span>CARDÁPIO</span>
        </button>
        <div>
          <h1 class="font-mono text-xs font-bold tracking-widest uppercase text-white leading-tight">
            ACOMPANHAMENTO AO VIVO
          </h1>
          <span class="text-[10px] font-mono text-red-500 font-bold uppercase tracking-wider block">
            PROTOCOLO #{orderId}
          </span>
        </div>
      </div>

      {#if currentStatus === 'CANCELADO'}
        <span class="px-2 py-0.5 bg-red-600 text-white font-mono text-[9px] font-bold uppercase">
          CANCELADO
        </span>
      {:else if tableNumber}
        <StatusBadge status="CONSUMO_LOCAL" />
      {:else if orderType === 'RETIRADA'}
        <span class="px-2 py-0.5 bg-blue-600 text-white font-mono text-[9px] font-bold uppercase">
          RETIRADA
        </span>
      {:else}
        <StatusBadge status="DELIVERY" />
      {/if}
    </div>
  </header>

  <!-- Body com Timeline e Detalhes -->
  <main class="p-4 space-y-4 flex-1 pb-12">
    <!-- Mensagens de Cancelamento -->
    {#if cancelMessage}
      <div in:fade={{ duration: 180 }} class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-900 uppercase">
        ✓ {cancelMessage}
      </div>
    {/if}

    {#if cancelError}
      <div in:fade={{ duration: 180 }} class="border-2 border-red-600 bg-red-50 p-3 font-mono text-xs font-bold text-red-900 uppercase">
        ⚠️ {cancelError}
      </div>
    {/if}

    <!-- Status Card Principal -->
    <div class="border-2 border-slate-900 bg-white p-5 space-y-3 shadow-[8px_8px_0_rgba(15,23,42,0.12)] text-slate-900">
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <span class="text-[10px] font-semibold tracking-widest uppercase text-slate-500">
          ESTADO ATUAL DO PEDIDO
        </span>
        <StatusBadge status={currentStatus} />
      </div>

      <div class="space-y-1">
        {#if currentStatus === 'CANCELADO'}
          <h2 class="font-mono text-base font-bold text-red-600 uppercase">
            PEDIDO CANCELADO
          </h2>
          <p class="text-xs text-slate-600 font-sans leading-relaxed">
            Este pedido foi cancelado e não será produzido pela cozinha.
          </p>
        {:else}
          <h2 class="font-mono text-base font-bold text-slate-900 uppercase">
            {steps.find(s => s.status === currentStatus)?.title || 'PEDIDO EM ANDAMENTO'}
          </h2>
          <p class="text-xs text-slate-600 font-sans leading-relaxed">
            {steps.find(s => s.status === currentStatus)?.subtitle || 'Seu pedido foi registrado no sistema e está sendo processado.'}
          </p>
        {/if}
      </div>

      <div class="pt-2 border-t border-slate-200 flex items-center justify-between font-mono text-[10px]">
        {#if currentStatus !== 'CANCELADO'}
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-none bg-red-600 animate-ping inline-block"></span>
            <span class="text-slate-500 font-bold uppercase tracking-wider">
              SINCRONIZADO AO VIVO COM A COZINHA (KDS)
            </span>
          </div>
        {:else}
          <span class="text-red-600 font-bold uppercase">OPERACÃO FINALIZADA</span>
        {/if}

        {#if orderData?.totalCents}
          <span class="font-bold text-slate-900 text-xs">
            TOTAL: {fmt(orderData.totalCents)}
          </span>
        {/if}
      </div>
    </div>

    <!-- Timeline Progressiva Vertical -->
    {#if currentStatus !== 'CANCELADO'}
      <div class="border border-slate-200 bg-white">
        <PanelHeader
          title="Linha do Tempo de Produção"
          subtitle={`Etapas de preparo no estabelecimento ${restaurant.name}`}
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
    {/if}

    <!-- Detalhes dos Itens do Pedido se disponíveis -->
    {#if orderData?.items && orderData.items.length > 0}
      <div class="border border-slate-200 bg-white">
        <PanelHeader
          title="Resumo dos Itens"
          subtitle="Produtos e personalizações deste pedido"
          index="02"
        />

        <div class="p-4 divide-y divide-slate-100 font-mono text-xs">
          {#each orderData.items as it}
            <div class="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
              <div>
                <span class="font-bold text-slate-900 uppercase">
                  {it.quantity}x {it.name}
                </span>
                {#if it.assemblies && it.assemblies.length > 0}
                  <ul class="text-[10px] text-slate-500 list-disc pl-4 pt-0.5">
                    {#each it.assemblies as a}
                      <li>{a}</li>
                    {/each}
                  </ul>
                {/if}
                {#if it.notes}
                  <p class="text-[10px] text-slate-400 italic pt-0.5">Obs: {it.notes}</p>
                {/if}
              </div>
              <span class="font-bold text-slate-900 shrink-0">
                {fmt(it.totalPriceCents || (it.unitPriceCents * it.quantity))}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Botão de Cancelamento Seguro (permitido apenas em RECEBIDO) -->
    {#if currentStatus === 'RECEBIDO'}
      <div class="p-4 bg-red-50/60 border border-red-200 flex items-center justify-between gap-2 font-mono text-xs">
        <div>
          <span class="font-bold text-red-900 uppercase block">DESEJA CANCELAR ESTE PEDIDO?</span>
          <span class="text-[10px] text-red-700 font-sans">Permitido enquanto o pedido ainda não entrou na chapa/cozinha.</span>
        </div>
        <button
          type="button"
          on:click={handleCancelOrder}
          disabled={isCancelling}
          class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-wider cursor-pointer disabled:opacity-50 transition-colors"
        >
          {isCancelling ? 'CANCELANDO...' : 'CANCELAR PEDIDO'}
        </button>
      </div>
    {/if}
  </main>

  <!-- Botão Rodapé com Contato Direto -->
  <footer class="p-4 bg-slate-100 border-t border-slate-200 space-y-2 sticky bottom-0 z-30">
    <button
      type="button"
      on:click={handleOpenWhatsApp}
      class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
    >
      <Icon name="whatsapp" size={16} />
      <span>FALAR COM A LOJA NO WHATSAPP</span>
    </button>

    <PrimaryButton
      label={`VOLTAR PARA O CARDÁPIO DE ${restaurant.name.toUpperCase()}`}
      variant="secondary"
      shortcut="Esc"
      fullWidth
      on:click={() => goto(`/${restaurant.slug || 'imperius-do-pastel'}`)}
    />
  </footer>
</div>
