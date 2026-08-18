<script lang="ts">
  import { goto } from '$app/navigation';
  import Modal from './Modal.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from './Icon.svelte';
  import FormField from './FormField.svelte';
  import { cartStore, cartSubtotalCents, cartSubtotalFormatted, cartItemCount } from '$stores/cartStore';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};
  export let deliveryFeeCents: number = 600;

  let couponCode = '';
  let appliedCoupon: { code: string; discountCents: number } | null = null;
  let couponError = '';

  $: discountCents = appliedCoupon ? appliedCoupon.discountCents : 0;
  $: finalTotalCents = Math.max(0, $cartSubtotalCents + deliveryFeeCents - discountCents);

  function handleApplyCoupon() {
    couponError = '';
    const clean = couponCode.trim().toUpperCase();
    if (!clean) return;

    if (clean === 'ESPANKA10' || clean === 'PRIMEIRO10') {
      appliedCoupon = { code: clean, discountCents: 1000 }; // R$ 10,00 OFF
      couponCode = '';
    } else if (clean === 'FRETEGRATIS') {
      appliedCoupon = { code: clean, discountCents: deliveryFeeCents }; // Frete grátis
      couponCode = '';
    } else {
      couponError = 'Cupom inválido ou expirado.';
    }
  }

  function handleRemoveCoupon() {
    appliedCoupon = null;
    couponError = '';
  }

  function handleProceedCheckout() {
    onClose();
    goto('/checkout');
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
</script>

<Modal
  {isOpen}
  {onClose}
  title="MINHA SACOLA DE COMPRAS"
  subtitle={`${$cartItemCount} ${$cartItemCount === 1 ? 'item selecionado' : 'itens selecionados'}`}
  maxWidth="lg"
>
  {#if $cartItemCount === 0}
    <!-- Empty Cart State -->
    <div class="py-12 px-4 text-center space-y-3 font-mono text-xs">
      <div class="w-16 h-16 bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
        <Icon name="utensils" size={32} />
      </div>
      <h3 class="font-bold text-slate-900 uppercase">SUA SACOLA ESTÁ VAZIA</h3>
      <p class="text-slate-500 font-sans text-xs max-w-xs mx-auto">
        Adicione deliciosos hambúrgueres e acompanhamentos do cardápio para continuar.
      </p>
      <div class="pt-2">
        <button
          type="button"
          on:click={onClose}
          class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase cursor-pointer"
        >
          EXPLORAR CARDÁPIO
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-4 font-sans text-xs text-slate-800">
      <!-- Lista de Itens do Carrinho com Controles de Quantidade e Remoção -->
      <div class="border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs">
        {#each $cartStore as item (item.cartItemId)}
          <div class="p-3 space-y-2 hover:bg-slate-50/60 transition-colors">
            <!-- Linha Principal do Item -->
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5 flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <h4 class="font-mono text-xs font-bold text-slate-900 uppercase leading-snug">
                    {item.productName}
                  </h4>
                </div>

                <!-- Detalhamento de Adicionais / Opções Escolhidas -->
                {#if item.selectedAssemblies && item.selectedAssemblies.length > 0}
                  <ul class="text-[11px] text-slate-600 font-mono space-y-0.5 pl-2 border-l-2 border-slate-200">
                    {#each item.selectedAssemblies as asm}
                      <li>
                        · {asm.name}
                        {#if asm.priceAdjustmentCents > 0}
                          <span class="text-slate-500">(+{fmt(asm.priceAdjustmentCents)})</span>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>

              <!-- Preço do Item -->
              <span class="font-mono text-xs font-bold text-slate-900 shrink-0">
                {fmt(item.itemTotalCents)}
              </span>
            </div>

            <!-- Campo de Observação Rápida -->
            <div class="pt-1">
              <input
                type="text"
                value={item.notes || ''}
                placeholder="Obs ex: sem sal, sem molho..."
                on:change={(e) => cartStore.updateItemNotes(item.cartItemId, e.currentTarget.value)}
                class="w-full p-1.5 bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <!-- Controles de Quantidade + Botão Remover -->
            <div class="flex items-center justify-between pt-1 border-t border-slate-100">
              <button
                type="button"
                on:click={() => cartStore.removeItem(item.cartItemId)}
                class="text-[10px] font-mono text-slate-500 hover:text-red-600 font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>REMOVER</span>
              </button>

              <!-- Stepper +/- -->
              <div class="flex items-center border border-slate-300 bg-white font-mono text-xs">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  on:click={() => cartStore.updateQuantity(item.cartItemId, -1)}
                  class="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
                >
                  -
                </button>
                <span class="px-3 py-0.5 font-bold text-slate-900 min-w-[24px] text-center">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  on:click={() => cartStore.updateQuantity(item.cartItemId, 1)}
                  class="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Seção de Aplicação de Cupom -->
      <div class="border border-slate-200 bg-slate-50 p-3 space-y-2">
        <span class="block text-[10px] font-semibold tracking-widest uppercase text-slate-600">
          CUPOM DE DESCONTO:
        </span>

        {#if appliedCoupon}
          <div class="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2 font-mono text-xs text-emerald-900">
            <div class="flex items-center gap-2">
              <Icon name="check" size={14} className="text-emerald-700" />
              <span class="font-bold">{appliedCoupon.code}</span>
              <span class="text-[10px] text-emerald-700">(-{fmt(appliedCoupon.discountCents)})</span>
            </div>
            <button
              type="button"
              on:click={handleRemoveCoupon}
              class="text-[10px] text-red-700 underline font-bold uppercase cursor-pointer"
            >
              REMOVER
            </button>
          </div>
        {:else}
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={couponCode}
              placeholder="Ex: ESPANKA10"
              class="flex-1 p-2 bg-white text-slate-900 border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-600 uppercase"
            />
            <button
              type="button"
              on:click={handleApplyCoupon}
              class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase cursor-pointer"
            >
              APLICAR
            </button>
          </div>
          {#if couponError}
            <span class="text-[10px] font-mono text-red-600 font-bold block">{couponError}</span>
          {/if}
        {/if}
      </div>

      <!-- Resumo Financeiro da Sacola -->
      <div class="border border-slate-200 bg-white p-3.5 space-y-2 font-mono text-xs">
        <div class="flex justify-between text-slate-600">
          <span>SUBTOTAL DOS ITENS:</span>
          <span class="font-bold text-slate-900">{$cartSubtotalFormatted}</span>
        </div>
        <div class="flex justify-between text-slate-600">
          <span>TAXA DE ENTREGA:</span>
          <span class="font-bold text-slate-900">{fmt(deliveryFeeCents)}</span>
        </div>
        {#if appliedCoupon}
          <div class="flex justify-between text-emerald-700 font-bold">
            <span>DESCONTO CUPOM ({appliedCoupon.code}):</span>
            <span>-{fmt(appliedCoupon.discountCents)}</span>
          </div>
        {/if}

        <div class="border-t border-slate-200 pt-2 flex justify-between items-center text-sm">
          <span class="font-bold text-slate-900 uppercase">TOTAL ESTIMADO:</span>
          <span class="font-bold text-red-600 text-base">{fmt(finalTotalCents)}</span>
        </div>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <div class="flex items-center justify-between w-full gap-2">
      {#if $cartItemCount > 0}
        <button
          type="button"
          on:click={() => cartStore.clearCart()}
          class="px-3 py-2 border border-slate-300 hover:bg-slate-100 font-mono text-[10px] font-bold uppercase text-slate-600 cursor-pointer"
        >
          ESVAZIAR SACOLA
        </button>

        <PrimaryButton
          label={`FINALIZAR PEDIDO (${fmt(finalTotalCents)})`}
          variant="primary"
          shortcut="↵"
          on:click={handleProceedCheckout}
        />
      {:else}
        <PrimaryButton
          label="FECHAR SACOLA"
          variant="secondary"
          shortcut="Esc"
          fullWidth
          on:click={onClose}
        />
      {/if}
    </div>
  </svelte:fragment>
</Modal>
