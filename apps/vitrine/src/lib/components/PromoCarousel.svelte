<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';

  export let restaurantName: string = '';
  export let promos: Array<{
    id: string;
    title: string;
    subtitle: string;
    tag: string;
    targetCategory?: string;
    ctaText: string;
    imageUrl?: string;
  }> = [];

  const dispatch = createEventDispatcher<{
    selectPromo: { promoId: string; targetCategory?: string };
  }>();

  $: activePromos = promos && promos.length > 0 ? promos : [
    {
      id: 'promo-01',
      title: restaurantName ? `DESTAQUES DE ${restaurantName.toUpperCase()}` : 'DESTAQUES DA CASA',
      subtitle: 'Receitas consagradas e preparo artesanal com os melhores ingredientes.',
      tag: 'ESPECIAL',
      ctaText: 'VER CARDÁPIO',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'promo-02',
      title: 'ENTREGA RÁPIDA & SEGURA',
      subtitle: 'Acompanhe cada etapa do seu pedido em tempo real até a sua porta.',
      tag: 'DELIVERY',
      ctaText: 'FAZER PEDIDO',
      imageUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'promo-03',
      title: 'CUPONS DE DESCONTO',
      subtitle: 'Aproveite descontos exclusivos para pedidos feitos no cardápio digital.',
      tag: 'ECONOMIZE',
      ctaText: 'VER CUPONS',
      imageUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=800&q=80'
    }
  ];

  let currentIndex = 0;
  let imageErrors: Record<string, boolean> = {};

  function nextSlide() {
    currentIndex = (currentIndex + 1) % activePromos.length;
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + activePromos.length) % activePromos.length;
  }

  function handleSelectPromo(promo: typeof activePromos[0]) {
    dispatch('selectPromo', {
      promoId: promo.id,
      targetCategory: promo.targetCategory
    });
  }

  function handleImageError(id: string) {
    imageErrors[id] = true;
  }
</script>

<div class="relative w-full border-2 border-slate-900 bg-slate-900 text-white overflow-hidden shadow-[4px_4px_0_rgba(15,23,42,0.15)]">
  {#each activePromos as promo, index (promo.id)}
    {#if index === currentIndex}
      <div class="relative min-h-[140px] p-4 flex flex-col justify-between transition-all duration-300">
        <!-- Background Banner Image with Dark Gradient Overlay for Maximum Legibility -->
        {#if promo.imageUrl && !imageErrors[promo.id]}
          <img
            src={promo.imageUrl}
            alt={promo.title}
            loading="lazy"
            on:error={() => handleImageError(promo.id)}
            class="absolute inset-0 w-full h-full object-cover opacity-45 mix-blend-luminosity"
          />
        {/if}
        <div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"></div>

        <div class="relative z-10 space-y-1 max-w-[80%]">
          <span class="inline-block bg-red-600 border border-red-700 text-white font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
            {promo.tag}
          </span>
          <h3 class="font-mono text-sm font-bold tracking-wide uppercase text-white leading-snug drop-shadow-xs">
            {promo.title}
          </h3>
          <p class="text-xs text-slate-300 font-sans line-clamp-2 leading-relaxed">
            {promo.subtitle}
          </p>
        </div>

        <div class="relative z-10 pt-2 flex items-center justify-between">
          <button
            type="button"
            on:click={() => handleSelectPromo(promo)}
            class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider border border-white transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span>{promo.ctaText}</span>
            <Icon name="arrow-right" size={12} />
          </button>

          <!-- Controls dots -->
          <div class="flex items-center gap-1.5 font-mono text-[10px]">
            <button
              type="button"
              aria-label="Slide anterior"
              on:click={prevSlide}
              class="w-6 h-6 bg-slate-900/80 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-800 cursor-pointer"
            >
              <Icon name="chevron-left" size={12} />
            </button>
            <span class="text-slate-400 font-bold px-1">
              {currentIndex + 1}/{activePromos.length}
            </span>
            <button
              type="button"
              aria-label="Próximo slide"
              on:click={nextSlide}
              class="w-6 h-6 bg-slate-900/80 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-800 cursor-pointer"
            >
              <Icon name="chevron-right" size={12} />
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/each}
</div>
