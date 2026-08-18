<script lang="ts">
  import Modal from './Modal.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from './Icon.svelte';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};

  const coupons = [
    {
      code: 'ESPANKA10',
      discount: 'R$ 10,00 OFF',
      description: 'Válido para pedidos acima de R$ 40,00 no primeiro pedido.',
      expiry: 'Validade: 31/12/2026'
    },
    {
      code: 'FRETEGRATIS',
      discount: 'ENTREGA GRÁTIS',
      description: 'Válido em pedidos acima de R$ 50,00 para entrega em domicílio.',
      expiry: 'Validade: Hoje'
    },
    {
      code: 'COMBO20',
      discount: '20% OFF EM COMBOS',
      description: 'Válido para qualquer Combo Especial Espanka Burguer.',
      expiry: 'Validade: Esta semana'
    }
  ];

  let appliedCode = '';

  function handleApplyCoupon(code: string) {
    appliedCode = code;
  }
</script>

<Modal
  {isOpen}
  {onClose}
  title="CUPONS DE DESCONTO"
  subtitle="Selecione um cupom para aplicar no seu pedido"
  maxWidth="md"
>
  <div class="space-y-3 font-sans text-xs">
    {#each coupons as c}
      <div class="border border-slate-200 bg-slate-50 p-3 space-y-1.5 relative">
        <div class="flex items-center justify-between">
          <span class="font-mono text-xs font-bold text-white bg-red-600 border border-red-700 px-2 py-0.5 uppercase tracking-wider">
            {c.code}
          </span>
          <span class="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 uppercase">
            {c.discount}
          </span>
        </div>

        <p class="text-xs text-slate-700 font-sans leading-relaxed pt-1">
          {c.description}
        </p>

        <div class="flex items-center justify-between pt-2 border-t border-slate-200 font-mono text-[10px]">
          <span class="text-slate-500">{c.expiry}</span>

          <button
            type="button"
            on:click={() => handleApplyCoupon(c.code)}
            class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1"
          >
            {#if appliedCode === c.code}
              <Icon name="check" size={12} className="text-emerald-400" />
              <span>APLICADO</span>
            {:else}
              <span>USAR CUPOM</span>
            {/if}
          </button>
        </div>
      </div>
    {/each}

    {#if appliedCode}
      <div class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs text-emerald-900 font-bold uppercase text-center flex items-center justify-center gap-1.5">
        <Icon name="check" size={14} className="text-emerald-700" />
        <span>CUPOM {appliedCode} ATIVADO NA COMANDA!</span>
      </div>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton
      label="FECHAR"
      variant="secondary"
      shortcut="Esc"
      on:click={onClose}
    />
  </svelte:fragment>
</Modal>
