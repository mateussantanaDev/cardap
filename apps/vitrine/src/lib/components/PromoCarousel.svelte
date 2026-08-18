<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';

  const dispatch = createEventDispatcher<{
    selectPromo: { promoId: string; targetCategory?: string };
  }>();

  const promos = [
    {
      id: 'promo-01',
      title: 'COMBO ESPANKA MONSTER',
      subtitle: 'Hambúrguer 180g + Batata Frita + Refrigerante 350ml com 15% OFF',
      tag: 'OFERTA DO DIA',
      targetCategory: 'HAMBURGUER',
      ctaText: 'VER OFERTA',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'promo-02',
      title: 'ENTREGA GRÁTIS NO CENTRO',
      subtitle: 'Nas compras acima de R$ 50,00 para entregas no bairro Centro em Águas Belas',
      tag: 'FRETE GRÁTIS',
      targetCategory: 'ENTRADAS',
      ctaText: 'APROVEITAR',
      imageUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'promo-03',
      title: 'CRISPY DE QUEIJO + MOLHO',
      subtitle: '10 unidades super crocantes por apenas R$ 23,00',
      tag: 'MAIS VENDIDO',
      targetCategory: 'ENTRADAS',
      ctaText: 'QUERO ESSE',
      imageUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=800&q=80'
    }
  ];

  let currentIndex = 0;
  let imageErrors: Record<string, boolean> = {};

  function nextSlide() {
    currentIndex = (currentIndex + 1) % promos.length;
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + promos.length) % promos.length;
  }

  function handleSelectPromo(promo: typeof promos[0]) {
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
  {#each promos as promo, index (promo.id)}
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
              {currentIndex + 1}/{promos.length}
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
