<script lang="ts">
  import { goto } from '$app/navigation';
  import StatusBadge from './StatusBadge.svelte';
  import CalculateDeliveryModal from './CalculateDeliveryModal.svelte';
  import Icon from './Icon.svelte';

  export let storeName: string = 'ESPANKA BURGUER';
  export let storeCategory: string = 'Hamburgueria Artesanal · Águas Belas';
  export let rating: string = '4.9 ★ (1.8k avaliações)';
  export let operatingHoursToday: string = 'Seg a Dom: 17:00 às 23:30';
  export let slaText: string = '15-30 min';
  export let deliveryFeeText: string = 'R$ 5,00';
  export let minOrderText: string = 'R$ 11,00';
  export let isOpen: boolean = true;

  let isDeliveryModalOpen = false;

  function handleOpenStorePage() {
    goto('/loja');
  }
</script>

<!-- Header Principal (Padrão MenuDino Espanka Burguer) -->
<header class="bg-slate-900 text-white border-b border-slate-800">
  <!-- Top Location & Delivery Bar (Calcular entrega abre modal de cálculo de frete) -->
  <div class="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between font-mono text-[11px] text-slate-300">
    <button
      type="button"
      on:click={() => isDeliveryModalOpen = true}
      class="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
    >
      <Icon name="location" size={14} className="text-red-500" />
      <span class="font-bold underline decoration-slate-600 underline-offset-2">Calcular taxa e tempo de entrega</span>
      <Icon name="chevron-right" size={14} />
    </button>

    <div class="flex items-center gap-2">
      <!-- Botão de Informações da Loja redireciona para a tela dedicada /loja -->
      <button
        type="button"
        on:click={handleOpenStorePage}
        aria-label="Ver informações completas da loja"
        class="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs flex items-center justify-center border border-slate-700 cursor-pointer"
      >
        <Icon name="info" size={14} />
      </button>
    </div>
  </div>

  <!-- Merchant Identity Card (Clicar no nome abre a tela dedicada /loja) -->
  <div class="p-4 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <button
        type="button"
        on:click={handleOpenStorePage}
        class="flex items-center gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer group"
      >
        <!-- Logo Avatar -->
        <div class="w-12 h-12 bg-red-600 border-2 border-red-700 flex items-center justify-center text-white shrink-0">
          <Icon name="burger" size={24} className="text-white" />
        </div>

        <div>
          <div class="flex items-center gap-1.5">
            <h1 class="font-mono text-sm font-bold tracking-wider uppercase text-white leading-tight group-hover:text-red-400 transition-colors">
              {storeName}
            </h1>
            <Icon name="chevron-right" size={14} className="text-slate-400 group-hover:text-white" />
          </div>
          <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
            {storeCategory} · <span class="text-amber-400 font-bold">{rating}</span>
          </span>
        </div>
      </button>

      <StatusBadge status={isOpen ? 'ABERTO' : 'FECHADO'} />
    </div>

    <!-- Merchant Stats Chips (Clicar abre o modal de cálculo de entrega) -->
    <button
      type="button"
      on:click={() => isDeliveryModalOpen = true}
      class="w-full border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-300 flex items-center justify-around gap-2 hover:bg-slate-900 transition-colors cursor-pointer"
    >
      <span class="flex items-center gap-1">
        <Icon name="delivery" size={14} className="text-slate-400" />
        <strong>{deliveryFeeText}</strong>
      </span>
      <span class="text-slate-700">|</span>
      <span class="flex items-center gap-1">
        <Icon name="clock" size={14} className="text-slate-400" />
        <strong>{slaText}</strong>
      </span>
      <span class="text-slate-700">|</span>
      <span class="flex items-center gap-1">
        <Icon name="currency" size={14} className="text-slate-400" />
        <strong>Mín. {minOrderText}</strong>
      </span>
    </button>
  </div>
</header>

<!-- Modal para Calcular Taxa e Tempo de Entrega -->
{#if isDeliveryModalOpen}
  <CalculateDeliveryModal
    isOpen={isDeliveryModalOpen}
    onClose={() => isDeliveryModalOpen = false}
  />
{/if}
