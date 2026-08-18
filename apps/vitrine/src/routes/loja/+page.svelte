<script lang="ts">
  import { goto } from '$app/navigation';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';
  import PanelHeader from '$components/PanelHeader.svelte';
  import StatusBadge from '$components/StatusBadge.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';

  const { currentSlug } = tenantVitrineManager;

  $: tenant = tenantVitrineManager.getTenant($currentSlug);

  const deliveryOptions = [
    { type: 'Delivery', description: 'Entrega rápida em domicílio', icon: 'delivery' },
    { type: 'Retirada', description: 'Retirada de pedidos no balcão', icon: 'store' },
    { type: 'Consumo no Local', description: 'Atendimento direto nas mesas', icon: 'utensils' }
  ];

  const paymentMethods = [
    'Dinheiro na Entrega',
    'Cartão de Crédito (Maquineta)',
    'Cartão de Débito (Maquineta)',
    'Pagamento PIX Instantâneo'
  ];

  function handleBackToCatalog() {
    goto(`/${$currentSlug}`);
  }
</script>

<!-- Tela Exclusiva de Detalhes da Loja (Multi-Tenant) -->
<div class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900 font-sans">
  
  <!-- Header Fixo da Tela -->
  <header class="bg-slate-900 text-white p-4 space-y-1 sticky top-0 z-30 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <button
        type="button"
        on:click={handleBackToCatalog}
        class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <Icon name="arrow-left" size={12} />
        <span>CARDÁPIO</span>
      </button>
      <div>
        <h1 class="font-mono text-xs font-bold tracking-widest uppercase text-white leading-tight">
          DETALHES DO ESTABELECIMENTO
        </h1>
        <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
          INFORMACÕES INSTITUCIONAIS & OPERACIONAIS
        </span>
      </div>
    </div>
  </header>

  <main class="p-4 space-y-5 flex-1 pb-16">
    <!-- Merchant Card Header -->
    <div class="border-2 border-slate-900 bg-white p-5 space-y-4 shadow-[8px_8px_0_rgba(15,23,42,0.12)]">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-14 h-14 bg-red-600 border-2 border-red-700 flex items-center justify-center text-white shrink-0 font-mono font-bold text-2xl">
            {tenant.name.charAt(0)}
          </div>
          <div>
            <h2 class="font-mono text-base font-bold text-slate-900 uppercase">
              {tenant.name}
            </h2>
            <span class="text-xs text-slate-600 font-sans block">{tenant.category}</span>
            <span class="text-xs font-mono text-amber-700 font-bold block mt-0.5">{tenant.rating}</span>
          </div>
        </div>

        <StatusBadge status={tenant.isOpen ? 'ABERTO' : 'FECHADO'} />
      </div>

      <!-- Operational Chips -->
      <div class="border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 flex items-center justify-around gap-2">
        <div class="flex items-center gap-1.5">
          <Icon name="delivery" size={16} className="text-slate-600" />
          <span>Entrega {tenant.deliveryFeeText}</span>
        </div>
        <span class="text-slate-300">|</span>
        <div class="flex items-center gap-1.5">
          <Icon name="clock" size={16} className="text-slate-600" />
          <span>{tenant.slaText}</span>
        </div>
        <span class="text-slate-300">|</span>
        <div class="flex items-center gap-1.5">
          <Icon name="currency" size={16} className="text-slate-600" />
          <span>Mín. {tenant.minOrderText}</span>
        </div>
      </div>
    </div>

    <!-- Seção 1: Opções de Entrega -->
    <div class="border border-slate-200 bg-white">
      <PanelHeader
        title="Opções de Entrega"
        subtitle="Modalidades de atendimento disponíveis no estabelecimento"
        index="01"
      />

      <div class="p-4 divide-y divide-slate-100 font-mono text-xs">
        {#each deliveryOptions as opt}
          <div class="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
            <div class="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
              <Icon name={opt.icon} size={16} />
            </div>
            <div>
              <h4 class="font-bold text-slate-900 uppercase">{opt.type}</h4>
              <p class="text-xs text-slate-600 font-sans">{opt.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Seção 2: Horário de Funcionamento -->
    <div class="border border-slate-200 bg-white">
      <PanelHeader
        title="Horário de Funcionamento"
        subtitle="Grade Semanal de Operação"
        index="02"
      />

      <div class="p-4 space-y-2 font-mono text-xs">
        <div class="flex items-center justify-between py-2 border-b border-slate-100">
          <span class="font-bold text-slate-900">Horário Regular:</span>
          <span class="text-slate-700 font-bold">{tenant.operatingHours}</span>
          <span class="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[9px] font-bold uppercase">
            Aberto
          </span>
        </div>
      </div>
    </div>

    <!-- Seção 3: Formas de Pagamento -->
    <div class="border border-slate-200 bg-white">
      <PanelHeader
        title="Formas de Pagamento"
        subtitle="Modalidades aceitas na entrega ou no balcão"
        index="03"
      />

      <div class="p-4 space-y-2 font-mono text-xs text-slate-800">
        <span class="font-bold uppercase block text-slate-600">Na entrega / balcão:</span>
        <ul class="space-y-1.5 list-disc pl-5 font-sans text-xs text-slate-700">
          {#each paymentMethods as pay}
            <li>{pay}</li>
          {/each}
        </ul>
      </div>
    </div>

    <!-- Seção 4: Dados Fiscais e Institucionais -->
    <div class="border border-slate-200 bg-slate-50 p-4 space-y-2 font-mono text-xs text-slate-800">
      <div class="flex justify-between border-b border-slate-200 pb-1.5">
        <span class="text-slate-500 uppercase">ESTABELECIMENTO:</span>
        <span class="font-bold text-slate-900">{tenant.name}</span>
      </div>
      <div class="flex justify-between border-b border-slate-200 pb-1.5">
        <span class="text-slate-500 uppercase">CONTATO:</span>
        <span class="font-bold text-slate-900">{tenant.phone}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-500 uppercase">ENDEREÇO:</span>
        <span class="font-sans text-[11px] text-slate-700 text-right">{tenant.address}</span>
      </div>
    </div>
  </main>

  <!-- Rodapé com Ação de Retorno ao Cardápio do Restaurante -->
  <footer class="p-4 bg-slate-100 border-t border-slate-200 sticky bottom-0 z-30">
    <PrimaryButton
      label={`VOLTAR AO CARDÁPIO DE ${tenant.name.toUpperCase()}`}
      variant="primary"
      shortcut="Esc"
      fullWidth
      on:click={handleBackToCatalog}
    />
  </footer>
</div>
