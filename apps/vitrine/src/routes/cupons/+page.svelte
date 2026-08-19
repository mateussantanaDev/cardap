<script lang="ts">
  import { goto } from '$app/navigation';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PanelHeader from '$components/PanelHeader.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import BottomBarNav from '$components/BottomBarNav.svelte';
  import FormField from '$components/FormField.svelte';
  import Icon from '$components/Icon.svelte';
  import { cartItemCount, cartSubtotalCents } from '$stores/cartStore';

  const { currentSlug } = tenantVitrineManager;

  let customCoupon = '';
  let appliedCouponCode = '';
  let applyMessage = '';
  let errorMessage = '';
  let copiedCode = '';
  let isLoading = false;

  // Lista de Cupons Ativos no Servidor
  const availableCoupons = [
    {
      code: 'ESPANKA10',
      discount: 'R$ 10,00 OFF',
      description: 'Válido para pedidos com subtotal acima de R$ 40,00.',
      expiry: 'Validade: Ativo hoje'
    },
    {
      code: 'PRIMEIRO10',
      discount: 'R$ 10,00 OFF',
      description: 'Cupom de boas-vindas para seu primeiro pedido.',
      expiry: 'Validade: Ativo hoje'
    },
    {
      code: 'FRETEGRATIS',
      discount: 'ENTREGA GRÁTIS',
      description: 'Isenção total da taxa de entrega em pedidos selecionados.',
      expiry: 'Validade: Ativo hoje'
    }
  ];

  async function handleValidateCoupon(code: string) {
    if (!code.trim()) return;
    isLoading = true;
    errorMessage = '';
    applyMessage = '';

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          subtotalCents: $cartSubtotalCents > 0 ? $cartSubtotalCents : 4000
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        appliedCouponCode = code.toUpperCase();
        applyMessage = `Cupom ${appliedCouponCode} ativado com sucesso! (${data.data.message || 'Desconto aplicado'})`;
      } else {
        errorMessage = data.error || 'Cupom inválido ou expirado no servidor.';
      }
    } catch (e) {
      errorMessage = 'Erro ao conectar ao servidor para validar o cupom.';
    } finally {
      isLoading = false;
    }
  }

  function handleCustomApply() {
    if (!customCoupon.trim()) return;
    handleValidateCoupon(customCoupon);
    customCoupon = '';
  }

  function handleCopyCoupon(code: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
    } catch {}
    copiedCode = code;
    setTimeout(() => {
      if (copiedCode === code) copiedCode = '';
    }, 2500);
  }
</script>

<div
  in:fly={{ y: 8, duration: 280, easing: cubicOut }}
  class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900 pb-16 font-sans"
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
            CUPONS DE DESCONTO
          </h1>
          <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
            CENTRAL DE PROMOÇÕES & VOUCHERS
          </span>
        </div>
      </div>
    </div>
  </header>

  <main class="p-4 space-y-5 flex-1 pb-20">
    <!-- Feedback de Ativação -->
    {#if applyMessage}
      <div
        in:fade={{ duration: 200 }}
        class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-900 uppercase flex items-center justify-between gap-2 shadow-xs"
      >
        <div class="flex items-center gap-2">
          <Icon name="check" size={16} className="text-emerald-700" />
          <span>{applyMessage}</span>
        </div>
      </div>
    {/if}

    {#if errorMessage}
      <div
        in:fade={{ duration: 200 }}
        class="border-2 border-red-600 bg-red-50 p-3 font-mono text-xs font-bold text-red-900 uppercase flex items-center gap-2 shadow-xs"
      >
        <span>⚠ {errorMessage}</span>
      </div>
    {/if}

    <!-- Inserção de Cupom Personalizado -->
    <div class="border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
      <span class="block font-mono text-[10px] font-bold tracking-widest uppercase text-slate-600">
        VALIDAR CÓDIGO NO SERVIDOR:
      </span>
      <div class="flex gap-2">
        <div class="flex-1">
          <FormField
            label=""
            name="customCoupon"
            type="text"
            bind:value={customCoupon}
            placeholder="Digite o código (ex: ESPANKA10)"
            mono
          />
        </div>
        <button
          type="button"
          on:click={handleCustomApply}
          disabled={isLoading}
          class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLoading ? 'VALIDANDO...' : 'VALIDAR'}
        </button>
      </div>
    </div>

    <!-- Lista de Cupons Disponíveis no Servidor -->
    <div class="border border-slate-200 bg-white">
      <PanelHeader
        title="Cupons Ativos Disponíveis"
        subtitle="Copie o código com 1 clique ou valide diretamente"
        index="01"
      />

      <div class="p-4 space-y-3">
        {#each availableCoupons as c}
          {@const isApplied = appliedCouponCode === c.code}
          {@const isCopied = copiedCode === c.code}

          <div class="border border-slate-200 bg-slate-50 p-4 space-y-2 relative transition-all duration-200 hover:border-slate-300">
            <div class="flex items-center justify-between gap-2">
              <button
                type="button"
                on:click={() => handleCopyCoupon(c.code)}
                class="font-mono text-xs font-bold text-white bg-red-600 hover:bg-red-700 border border-red-700 px-2.5 py-1 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Clique para copiar o código"
              >
                <span>{c.code}</span>
                <span class="text-[9px] opacity-80">{isCopied ? '✓ COPIADO!' : '⧉'}</span>
              </button>
              <span class="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 uppercase">
                {c.discount}
              </span>
            </div>

            <p class="text-xs text-slate-700 font-sans leading-relaxed pt-1">
              {c.description}
            </p>

            <div class="flex items-center justify-between pt-3 border-t border-slate-200 font-mono text-[10px]">
              <span class="text-slate-500">{c.expiry}</span>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  on:click={() => handleCopyCoupon(c.code)}
                  class="px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer"
                >
                  {isCopied ? 'CÓDIGO COPIADO!' : 'COPIAR'}
                </button>

                <button
                  type="button"
                  on:click={() => handleValidateCoupon(c.code)}
                  disabled={isLoading}
                  class="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 {isApplied ? 'bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}"
                >
                  {#if isApplied}
                    <Icon name="check" size={12} className="text-white" />
                    <span>VALIDADO</span>
                  {:else}
                    <span>TESTAR</span>
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </main>

  <!-- Rodapé Fixo de Navegação -->
  <div class="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50">
    <BottomBarNav
      activeTab="cupons"
      cartCount={$cartItemCount}
    />
  </div>
</div>
