<script lang="ts">
  import Icon from './Icon.svelte';
  import { cartStore } from '$stores/cartStore';

  export let product: {
    id: string;
    name: string;
    description?: string;
    basePriceCents: number;
    originalPriceCents?: number;
    code: string;
    isCustomizable?: boolean;
    isBestSeller?: boolean;
    discountPercentage?: number;
    prepTimeMinutes?: number;
    icon?: string;
    imageUrl?: string;
  };

  export let onSelectProduct: (product: any) => void = () => {};

  let imageError = false;

  $: cartItem = $cartStore.find(i => i.productId === product.id && (!i.selectedAssemblies || i.selectedAssemblies.length === 0));

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectProduct(product);
    }
  }

  function handleImageError() {
    imageError = true;
  }
</script>

<div
  role="button"
  tabindex="0"
  class="bg-white border-b border-slate-200 p-3.5 flex items-start justify-between gap-3.5 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer group"
  on:click={() => onSelectProduct(product)}
  on:keydown={handleKeyDown}
>
  <!-- Left Thumbnail Image (Exibe Imagem Real Cadastrada no ERP) -->
  <div class="w-20 h-20 bg-slate-100 border border-slate-300 shrink-0 flex items-center justify-center text-slate-700 relative overflow-hidden">
    {#if product.imageUrl && !imageError}
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        on:error={handleImageError}
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    {:else}
      <Icon name={product.icon || 'burger'} size={32} className="text-slate-600" />
    {/if}

    {#if product.discountPercentage}
      <span class="absolute top-0 left-0 bg-red-600 text-white font-mono font-bold text-[8px] px-1 py-0.5 uppercase z-10">
        -{product.discountPercentage}%
      </span>
    {/if}
  </div>

  <!-- Right Details & Price -->
  <div class="flex-1 min-w-0 space-y-1">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
        {product.code}
      </span>

      {#if product.isBestSeller}
        <span class="border border-amber-600 bg-amber-50 text-amber-900 px-1 py-0.5 font-mono text-[8px] font-bold tracking-wider uppercase flex items-center gap-1">
          <Icon name="fire" size={10} className="text-amber-600" />
          <span>MAIS VENDIDO</span>
        </span>
      {/if}
    </div>

    <h4 class="font-bold text-sm text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
      {product.name}
    </h4>

    {#if product.description}
      <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed font-sans">
        {product.description}
      </p>
    {/if}

    <div class="pt-1 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="font-mono text-sm font-bold text-slate-900">
          {fmt(product.basePriceCents)}
        </span>

        {#if product.originalPriceCents && product.originalPriceCents > product.basePriceCents}
          <span class="font-mono text-xs text-slate-400 line-through">
            {fmt(product.originalPriceCents)}
          </span>
        {/if}
      </div>

      <!-- Se o item simples já estiver na sacola, exibe o Stepper de quantidade reativo no card -->
      {#if cartItem && !product.isCustomizable}
        <div
          class="flex items-center border border-slate-300 bg-white font-mono text-xs z-10"
          on:click|stopPropagation={() => {}}
          on:keydown|stopPropagation={() => {}}
          role="presentation"
        >
          <button
            type="button"
            aria-label="Diminuir quantidade no carrinho"
            on:click={() => cartStore.updateQuantity(cartItem.cartItemId, -1)}
            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
          >
            -
          </button>
          <span class="px-2.5 py-1 font-bold text-slate-900 min-w-[20px] text-center">
            {cartItem.quantity}
          </span>
          <button
            type="button"
            aria-label="Aumentar quantidade no carrinho"
            on:click={() => cartStore.updateQuantity(cartItem.cartItemId, 1)}
            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
          >
            +
          </button>
        </div>
      {:else}
        <button
          type="button"
          aria-label="Adicionar {product.name} ao carrinho"
          class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          on:click|stopPropagation={() => onSelectProduct(product)}
        >
          + ADICIONAR
        </button>
      {/if}
    </div>
  </div>
</div>
