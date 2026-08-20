<script lang="ts">
  import { goto } from '$app/navigation';
  import StatusBadge from './StatusBadge.svelte';
  import CalculateDeliveryModal from './CalculateDeliveryModal.svelte';
  import Icon from './Icon.svelte';

  export let storeName: string = 'Restaurante';
  export let storeCategory: string = 'Lanches & Bebidas';
  export let rating: string = '5.0 ★ (Novo)';
  export let operatingHoursToday: string = 'Consulte horários';
  export let slaText: string = '20-40 min';
  export let deliveryFeeText: string = 'Grátis';
  export let minOrderText: string = 'R$ 0,00';
  export let isOpen: boolean = true;
  export let logoUrl: string = '';
  export let bannerUrl: string = '';
  export let primaryColor: string = '#dc2626';
  export let secondaryColor: string = '#0f172a';

  let isDeliveryModalOpen = false;

  function handleOpenStorePage() {
    goto('/loja');
  }
</script>

<!-- Header Principal Customizado do Estabelecimento -->
<header
  class="text-white border-b border-slate-800 relative overflow-hidden transition-colors"
  style="background-color: {secondaryColor || '#0f172a'};"
>
  <!-- Background Banner Imagem da Capa -->
  {#if bannerUrl}
    <div class="absolute inset-0 z-0 pointer-events-none">
      <img src={bannerUrl} alt={storeName} class="w-full h-full object-cover opacity-30" />
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-black/40"></div>
    </div>
  {/if}

  <!-- Top Location & Delivery Bar -->
  <div class="relative z-10 bg-black/40 px-4 py-2 border-b border-white/10 flex items-center justify-between font-mono text-[11px] text-slate-300 backdrop-blur-xs">
    <button
      type="button"
      on:click={() => isDeliveryModalOpen = true}
      class="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
    >
      <Icon name="location" size={14} className="text-red-400" />
      <span class="font-bold underline decoration-slate-400 underline-offset-2">Calcular taxa e tempo de entrega</span>
      <Icon name="chevron-right" size={14} />
    </button>

    <div class="flex items-center gap-2">
      <button
        type="button"
        on:click={handleOpenStorePage}
        aria-label="Ver informações completas da loja"
        class="w-7 h-7 bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center justify-center border border-white/20 cursor-pointer"
      >
        <Icon name="info" size={14} />
      </button>
    </div>
  </div>

  <!-- Merchant Identity Card -->
  <div class="relative z-10 p-4 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <button
        type="button"
        on:click={handleOpenStorePage}
        class="flex items-center gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer group"
      >
        <!-- Logo Avatar -->
        <div
          class="w-14 h-14 border-2 border-white/30 flex items-center justify-center text-white shrink-0 overflow-hidden font-mono font-bold text-xl shadow-md"
          style="background-color: {primaryColor || '#dc2626'};"
        >
          {#if logoUrl}
            <img src={logoUrl} alt={storeName} class="w-full h-full object-contain bg-white" />
          {:else}
            {storeName.slice(0, 1).toUpperCase()}
          {/if}
        </div>

        <div>
          <div class="flex items-center gap-1.5">
            <h1 class="font-mono text-base font-bold tracking-wider uppercase text-white leading-tight group-hover:text-amber-300 transition-colors">
              {storeName}
            </h1>
            <Icon name="chevron-right" size={14} className="text-slate-300 group-hover:text-white" />
          </div>
          <span class="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wider block mt-0.5">
            {storeCategory} · <span class="text-amber-400 font-bold">{rating}</span>
          </span>
        </div>
      </button>

      <StatusBadge status={isOpen ? 'ABERTO' : 'FECHADO'} />
    </div>

    <!-- Merchant Stats Chips -->
    <button
      type="button"
      on:click={() => isDeliveryModalOpen = true}
      class="w-full border border-white/10 bg-black/40 p-2.5 font-mono text-[11px] text-slate-200 flex items-center justify-around gap-2 hover:bg-black/60 transition-colors cursor-pointer backdrop-blur-xs shadow-xs"
    >
      <span class="flex items-center gap-1">
        <Icon name="delivery" size={14} className="text-slate-300" />
        <strong>{deliveryFeeText}</strong>
      </span>
      <span class="text-slate-500">|</span>
      <span class="flex items-center gap-1">
        <Icon name="clock" size={14} className="text-slate-300" />
        <strong>{slaText}</strong>
      </span>
      <span class="text-slate-500">|</span>
      <span class="flex items-center gap-1">
        <Icon name="currency" size={14} className="text-slate-300" />
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
