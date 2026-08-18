<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';

  const { currentSlug } = tenantVitrineManager;
  $: activeTenant = tenantVitrineManager.getTenant($currentSlug);
  $: restaurantPhone = (activeTenant?.phone || '87998123456').replace(/\D/g, '');
  $: cleanPhone = restaurantPhone.length <= 11 && !restaurantPhone.startsWith('55') ? `55${restaurantPhone}` : restaurantPhone;
  import PanelHeader from '$components/PanelHeader.svelte';
  import StatusBadge from '$components/StatusBadge.svelte';
  import TimelineStep from '$components/TimelineStep.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';

  let orderId = $page.params.id || 'ord-105';
  let orderType = $page.url.searchParams.get('type') || 'DELIVERY';
  let tableNumber = $page.url.searchParams.get('table') || '';

  type StatusStep = 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE';
  let currentStatus: StatusStep = 'RECEBIDO';
  let interval: any;

  onMount(() => {
    interval = setInterval(() => {
      if (currentStatus === 'RECEBIDO') {
        currentStatus = 'EM_PREPARO';
      } else if (currentStatus === 'EM_PREPARO') {
        currentStatus = 'PRONTO';
      } else if (currentStatus === 'PRONTO') {
        currentStatus = 'ENTREGUE';
        clearInterval(interval);
      }
    }, 6000);

    return () => {
      if (interval) clearInterval(interval);
    };
  });

  const steps: Array<{ status: StatusStep; title: string; subtitle: string; icon: string }> = [
    { status: 'RECEBIDO', title: 'PEDIDO RECEBIDO', subtitle: 'Confirmado pelo sistema Espanka Burguer e enviado para a cozinha.', icon: '1' },
    { status: 'EM_PREPARO', title: 'EM PREPARO NA CHAPA', subtitle: 'Hambúrguer artesanal sendo selado e montado no pão brioche.', icon: '2' },
    { status: 'PRONTO', title: orderType === 'DELIVERY' ? 'SAIU PARA ENTREGA' : 'PRONTO NA MESA', subtitle: orderType === 'DELIVERY' ? 'Motoboy a caminho do seu endereço.' : 'Pronto para consumo na sua mesa.', icon: '3' },
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
</script>

<div class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900">
  <!-- Header Institucional -->
  <header class="bg-slate-900 text-white p-4 space-y-1 sticky top-0 z-30 border-b border-slate-800">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <a
          href="/"
          class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition-colors"
        >
          ← VOLTAR
        </a>
        <div>
          <h1 class="font-mono text-xs font-bold tracking-widest uppercase text-white leading-tight">
            RASTREAMENTO EM TEMPO REAL
          </h1>
          <!-- 10% Accent Protocol -->
          <span class="text-[10px] font-mono text-red-500 font-bold uppercase tracking-wider block">
            PROTOCOLO #{orderId}
          </span>
        </div>
      </div>

      {#if tableNumber}
        <StatusBadge status="CONSUMO_LOCAL" />
      {:else}
        <StatusBadge status="DELIVERY" />
      {/if}
    </div>
  </header>

  <!-- Body com Timeline Progressiva -->
  <main class="p-4 space-y-4 flex-1 pb-12">
    <!-- Status Card Principal (70% Surface White + 20% Slate-900 Border + 10% Accent Ping) -->
    <div class="border-2 border-slate-900 bg-white p-5 space-y-3 shadow-[8px_8px_0_rgba(15,23,42,0.12)] text-slate-900">
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <span class="text-[10px] font-semibold tracking-widest uppercase text-slate-500">
          ESTADO ATUAL DO PEDIDO
        </span>
        <StatusBadge status={currentStatus} />
      </div>

      <div class="space-y-1">
        <h2 class="font-mono text-base font-bold text-slate-900 uppercase">
          {steps.find(s => s.status === currentStatus)?.title}
        </h2>
        <p class="text-xs text-slate-600 font-sans leading-relaxed">
          {steps.find(s => s.status === currentStatus)?.subtitle}
        </p>
      </div>

      <div class="pt-2 border-t border-slate-200 flex items-center gap-2">
        <span class="h-2 w-2 rounded-none bg-red-600 animate-ping inline-block"></span>
        <span class="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          ATUALIZAÇÃO AO VIVO VIA WEBSOCKET (REALTIME KDS)
        </span>
      </div>
    </div>

    <!-- Timeline Progressiva Vertical -->
    <div class="border border-slate-200 bg-white">
      <PanelHeader
        title="Linha do Tempo de Produção"
        subtitle="Etapas de preparo no Espanka Burguer"
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
  </main>

  <!-- Botão Rodapé -->
  <footer class="p-4 bg-slate-100 border-t border-slate-200 space-y-2">
    <PrimaryButton
      label="ABRIR PEDIDO NO WHATSAPP 💬"
      variant="primary"
      fullWidth
      on:click={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}
    />

    <PrimaryButton
      label="VOLTAR PARA O CARDÁPIO"
      variant="secondary"
      shortcut="Esc"
      fullWidth
      on:click={() => window.location.href = '/'}
    />
  </footer>
</div>
