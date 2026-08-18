<script lang="ts">
  import Modal from './Modal.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from './Icon.svelte';
  import { cartStore } from '$stores/cartStore';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};

  export let product: {
    id: string;
    name: string;
    description?: string;
    basePriceCents: number;
    code: string;
    icon?: string;
    imageUrl?: string;
    assemblyGroups?: Array<{
      id: string;
      name: string;
      minChoices: number;
      maxChoices: number;
      isRequired: boolean;
      options: Array<{
        id: string;
        name: string;
        priceAdjustmentCents: number;
      }>;
    }>;
  };

  let quantity = 1;
  let selectedOptions: Record<string, string[]> = {};
  let imageError = false;

  $: {
    if (product && product.assemblyGroups) {
      const initial: Record<string, string[]> = {};
      product.assemblyGroups.forEach(group => {
        initial[group.id] = [];
      });
      selectedOptions = initial;
    }
    quantity = 1;
    imageError = false;
  }

  function toggleOption(groupId: string, optionId: string, maxChoices: number) {
    const current = selectedOptions[groupId] || [];
    if (maxChoices === 1) {
      selectedOptions[groupId] = [optionId];
    } else {
      if (current.includes(optionId)) {
        selectedOptions[groupId] = current.filter(id => id !== optionId);
      } else {
        if (current.length < maxChoices) {
          selectedOptions[groupId] = [...current, optionId];
        }
      }
    }
  }

  $: additionalCents = Object.entries(selectedOptions).reduce((total, [groupId, optIds]) => {
    const group = product?.assemblyGroups?.find(g => g.id === groupId);
    if (!group) return total;
    const groupCost = optIds.reduce((sum, optId) => {
      const opt = group.options.find(o => o.id === optId);
      return sum + (opt ? opt.priceAdjustmentCents : 0);
    }, 0);
    return total + groupCost;
  }, 0);

  $: unitPriceCents = (product?.basePriceCents || 0) + additionalCents;
  $: totalPriceCents = unitPriceCents * quantity;

  $: isFormValid = (product?.assemblyGroups || []).every(group => {
    if (!group.isRequired) return true;
    const count = (selectedOptions[group.id] || []).length;
    return count >= group.minChoices;
  });

  function handleAddToCart() {
    if (!isFormValid) return;

    const selections = Object.entries(selectedOptions).flatMap(([groupId, optIds]) => {
      const group = product.assemblyGroups?.find(g => g.id === groupId);
      if (!group) return [];
      return optIds.map(optId => {
        const opt = group.options.find(o => o.id === optId);
        return {
          id: optId,
          name: opt ? opt.name : '',
          quantity: 1,
          priceAdjustmentCents: opt ? opt.priceAdjustmentCents : 0
        };
      });
    });

    cartStore.addItem({
      productId: product.id,
      productName: product.name,
      basePriceCents: product.basePriceCents,
      quantity,
      selectedAssemblies: selections,
      selectedModifiers: [],
      selectedComplements: []
    });

    onClose();
  }

  const fmt = (cents: number) => {
    const valid = (cents !== undefined && cents !== null && !isNaN(cents)) ? Number(cents) : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valid / 100);
  };
</script>

<Modal
  {isOpen}
  {onClose}
  title="MONTE SEU PEDIDO"
  subtitle={product ? product.name : ''}
  maxWidth="lg"
>
  {#if product}
    <div class="space-y-4 font-sans text-xs text-slate-800">
      <!-- Top Product Header Card with Photograph (Imagem Real do ERP) -->
      <div class="border border-slate-200 bg-slate-50 overflow-hidden flex flex-col sm:flex-row items-stretch">
        <div class="w-full sm:w-36 h-36 bg-slate-200 shrink-0 relative flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-200">
          {#if product.imageUrl && !imageError}
            <img
              src={product.imageUrl}
              alt={product.name}
              on:error={() => imageError = true}
              class="w-full h-full object-cover"
            />
          {:else}
            <Icon name={product.icon || 'burger'} size={48} className="text-slate-500" />
          {/if}
        </div>

        <div class="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[9px] font-bold text-slate-500 uppercase">{product.code}</span>
            </div>
            <h3 class="font-mono text-sm font-bold text-slate-900 uppercase">
              {product.name}
            </h3>
            {#if product.description}
              <p class="text-xs text-slate-600 font-sans leading-relaxed pt-1">
                {product.description}
              </p>
            {/if}
          </div>

          <div class="pt-2 border-t border-slate-200 flex items-center justify-between font-mono text-xs">
            <span class="text-slate-500 uppercase">PREÇO BASE:</span>
            <span class="font-bold text-slate-900">{fmt(product.basePriceCents)}</span>
          </div>
        </div>
      </div>

      <!-- Grupos de Opcionais / Montagem -->
      {#if product.assemblyGroups && product.assemblyGroups.length > 0}
        <div class="space-y-4 pt-1">
          {#each product.assemblyGroups as group}
            <div class="border border-slate-200 bg-white shadow-xs">
              <div class="bg-slate-100 p-2.5 border-b border-slate-200 flex items-center justify-between font-mono text-xs">
                <span class="font-bold text-slate-900 uppercase">{group.name}</span>
                {#if group.isRequired}
                  <span class="px-1.5 py-0.5 bg-red-600 text-white font-mono text-[9px] font-bold uppercase">
                    OBRIGATÓRIO
                  </span>
                {:else}
                  <span class="text-[10px] text-slate-500 uppercase">OPCIONAL</span>
                {/if}
              </div>

              <div class="p-3 divide-y divide-slate-100">
                {#each group.options as opt}
                  {@const isChecked = (selectedOptions[group.id] || []).includes(opt.id)}

                  <label class="py-2 flex items-center justify-between cursor-pointer group hover:bg-slate-50 px-1 transition-colors">
                    <div class="flex items-center gap-2.5">
                      <input
                        type={group.maxChoices === 1 ? 'radio' : 'checkbox'}
                        name={group.id}
                        checked={isChecked}
                        on:change={() => toggleOption(group.id, opt.id, group.maxChoices)}
                        class="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-600"
                      />
                      <span class="text-xs text-slate-800 font-sans font-medium group-hover:text-slate-900">
                        {opt.name}
                      </span>
                    </div>

                    <span class="font-mono text-xs font-bold text-slate-700">
                      {opt.priceAdjustmentCents > 0 ? `+ ${fmt(opt.priceAdjustmentCents)}` : 'Grátis'}
                    </span>
                  </label>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Controles de Quantidade e Total -->
      <div class="border-t border-slate-200 pt-3 flex items-center justify-between font-mono text-xs">
        <span class="font-bold text-slate-700 uppercase">QUANTIDADE:</span>
        <div class="flex items-center border border-slate-300 bg-white">
          <button
            type="button"
            on:click={() => quantity = Math.max(1, quantity - 1)}
            class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
          >
            -
          </button>
          <span class="px-4 py-1 font-bold text-slate-900">{quantity}</span>
          <button
            type="button"
            on:click={() => quantity += 1}
            class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
          >
            +
          </button>
        </div>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <div class="flex items-center justify-between w-full">
      <div class="font-mono text-xs">
        <span class="text-slate-500 uppercase block text-[10px]">TOTAL DO ITEM:</span>
        <span class="font-bold text-red-600 text-sm">{fmt(totalPriceCents)}</span>
      </div>

      <PrimaryButton
        label="ADICIONAR À SACOLA"
        variant="primary"
        shortcut="↵"
        disabled={!isFormValid}
        on:click={handleAddToCart}
      />
    </div>
  </svelte:fragment>
</Modal>
