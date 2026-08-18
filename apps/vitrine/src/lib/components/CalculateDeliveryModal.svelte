<script lang="ts">
  import Modal from './Modal.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from './Icon.svelte';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};

  let deliveryType: 'DELIVERY' | 'RETIRADA' | 'CONSUMO_LOCAL' = 'DELIVERY';
  let cepInput = '';
  let neighborhoodInput = 'Centro';
  let calculatedFeeCents = 500;
  let estimatedTime = '15-30 min';
  let isCalculating = false;

  async function handleCalculate() {
    isCalculating = true;
    try {
      const res = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neighborhood: neighborhoodInput,
          zipCode: cepInput || undefined,
          subtotalCents: 3000
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        calculatedFeeCents = json.data.deliveryFeeCents;
        estimatedTime = `${json.data.estimatedSlaMinutes - 10}-${json.data.estimatedSlaMinutes} min`;
      }
    } catch (e) {
      console.error('Erro ao calcular taxa de entrega no servidor:', e);
    } finally {
      isCalculating = false;
    }
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
</script>

<Modal
  {isOpen}
  {onClose}
  title="CALCULAR TAXA E TEMPO DE ENTREGA"
  subtitle="Selecione o tipo de atendimento e informe seu bairro ou CEP"
  maxWidth="md"
>
  <div class="space-y-4 font-sans text-xs text-slate-800">
    <!-- Seletor de Tipo de Atendimento -->
    <div class="space-y-1">
      <span class="block text-[10px] font-semibold tracking-widest uppercase text-slate-500">
        MODALIDADE DE PEDIDO:
      </span>
      <div class="grid grid-cols-3 gap-2 font-mono text-xs">
        <button
          type="button"
          on:click={() => deliveryType = 'DELIVERY'}
          class="p-2.5 border text-center transition-colors cursor-pointer flex flex-col items-center gap-1 {deliveryType === 'DELIVERY' ? 'bg-red-50 border-red-600 text-red-700 font-bold' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}"
        >
          <Icon name="delivery" size={16} />
          <span class="text-[10px] uppercase">DELIVERY</span>
        </button>

        <button
          type="button"
          on:click={() => deliveryType = 'RETIRADA'}
          class="p-2.5 border text-center transition-colors cursor-pointer flex flex-col items-center gap-1 {deliveryType === 'RETIRADA' ? 'bg-red-50 border-red-600 text-red-700 font-bold' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}"
        >
          <Icon name="store" size={16} />
          <span class="text-[10px] uppercase">RETIRADA</span>
        </button>

        <button
          type="button"
          on:click={() => deliveryType = 'CONSUMO_LOCAL'}
          class="p-2.5 border text-center transition-colors cursor-pointer flex flex-col items-center gap-1 {deliveryType === 'CONSUMO_LOCAL' ? 'bg-red-50 border-red-600 text-red-700 font-bold' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}"
        >
          <Icon name="utensils" size={16} />
          <span class="text-[10px] uppercase">MESA</span>
        </button>
      </div>
    </div>

    {#if deliveryType === 'DELIVERY'}
      <!-- Formulário de Cálculo de Frete via API do Servidor -->
      <div class="space-y-3 border border-slate-200 bg-slate-50 p-3">
        <div class="space-y-1">
          <label for="select-neighborhood" class="block text-[10px] font-semibold tracking-widest uppercase text-slate-600">
            DIGITE OU SELECIONE SEU BAIRRO:
          </label>
          <input
            id="select-neighborhood"
            type="text"
            bind:value={neighborhoodInput}
            on:change={handleCalculate}
            placeholder="Ex: Centro, Bairro Novo, São José"
            class="w-full p-2 bg-white text-slate-900 border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div class="space-y-1">
          <label for="cep-input" class="block text-[10px] font-semibold tracking-widest uppercase text-slate-600">
            OU DIGITE SEU CEP (OPCIONAL):
          </label>
          <div class="flex gap-2">
            <input
              id="cep-input"
              type="text"
              bind:value={cepInput}
              placeholder="55340-000"
              class="flex-1 p-2 bg-white text-slate-900 border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button
              type="button"
              on:click={handleCalculate}
              disabled={isCalculating}
              class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
            >
              {isCalculating ? 'CALCULANDO...' : 'CALCULAR'}
            </button>
          </div>
        </div>

        <!-- Resultado do Cálculo Retornado da API -->
        <div class="border-t border-slate-200 pt-3 space-y-2 font-mono text-xs">
          <div class="flex justify-between items-center">
            <span class="text-slate-600 uppercase">TAXA DE ENTREGA:</span>
            <span class="font-bold text-red-600 text-sm">{fmt(calculatedFeeCents)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-600 uppercase">TEMPO ESTIMADO:</span>
            <span class="font-bold text-slate-900">{estimatedTime}</span>
          </div>
        </div>
      </div>
    {:else if deliveryType === 'RETIRADA'}
      <div class="border border-slate-200 bg-slate-50 p-4 space-y-2 font-mono text-xs">
        <div class="flex items-center gap-2 text-emerald-700 font-bold">
          <Icon name="check" size={16} />
          <span>RETIRADA NO BALCÃO DA LOJA</span>
        </div>
        <p class="text-slate-600 font-sans text-xs">
          Você retira diretamente em nosso balcão. Taxa de entrega: <strong>R$ 0,00</strong>.
          Tempo estimado de preparo: <strong>15-20 min</strong>.
        </p>
      </div>
    {:else}
      <div class="border border-slate-200 bg-slate-50 p-4 space-y-2 font-mono text-xs">
        <div class="flex items-center gap-2 text-amber-800 font-bold">
          <Icon name="utensils" size={16} />
          <span>CONSUMO NA MESA</span>
        </div>
        <p class="text-slate-600 font-sans text-xs">
          Faça seu pedido diretamente da sua mesa digitando o número da mesa no checkout.
          Sem taxa de entrega.
        </p>
      </div>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton
      label="CONFIRMAR E CONTINUAR"
      variant="primary"
      shortcut="↵"
      on:click={onClose}
    />
  </svelte:fragment>
</Modal>
