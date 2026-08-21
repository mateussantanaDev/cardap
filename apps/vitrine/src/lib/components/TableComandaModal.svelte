<script lang="ts">
  import Modal from '$components/Modal.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import { tableSessionStore, tableNumber, comandaTotalFormatted } from '$stores/tableSessionStore';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};
</script>

{#if isOpen}
  <Modal
    {isOpen}
    title={`Comanda Digital — Mesa ${$tableNumber || ''}`}
    subtitle="Consumo presencial registrado nesta mesa"
    maxWidth="md"
    {onClose}
  >
    <div class="space-y-4 font-mono text-xs text-slate-900">
      <!-- Header do Consumo da Mesa -->
      <div class="p-3 bg-amber-50 border border-amber-300 flex items-center justify-between">
        <div>
          <span class="text-[10px] text-amber-800 uppercase font-bold block">Status da Mesa:</span>
          <span class="font-extrabold text-slate-900 text-sm">MESA {$tableNumber} (ATIVA)</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-500 uppercase font-bold block">Subtotal Lançado:</span>
          <span class="font-extrabold text-red-600 text-base">{$comandaTotalFormatted}</span>
        </div>
      </div>

      <!-- Lista de Itens da Comanda -->
      <div>
        <span class="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">
          Itens Lançados nesta Comanda:
        </span>

        {#if !$tableSessionStore.comandaItems || $tableSessionStore.comandaItems.length === 0}
          <div class="p-6 border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-1.5">
            <div class="text-2xl">🍽️</div>
            <div class="font-bold text-slate-800">Nenhum pedido enviado ainda</div>
            <p class="text-slate-500 font-sans text-xs">
              Adicione pratos ou bebidas do cardápio à sacola e finalize para lançar na comanda desta mesa.
            </p>
          </div>
        {:else}
          <div class="divide-y divide-slate-100 border border-slate-200 bg-white">
            {#each $tableSessionStore.comandaItems as item}
              <div class="p-3 flex items-center justify-between">
                <div>
                  <span class="font-bold">{item.qty}x {item.name}</span>
                  {#if item.notes}
                    <span class="block text-[10px] text-slate-500 font-sans">Obs: {item.notes}</span>
                  {/if}
                </div>
                <span class="font-bold text-slate-900">{item.priceFormatted}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Informação de Pagamento no Salão -->
      <div class="p-3 bg-slate-100 border border-slate-200 text-[11px] font-sans text-slate-600 space-y-1">
        <p class="font-bold text-slate-800 font-mono text-[10px] uppercase">
          💡 Como funciona o fechamento de conta?
        </p>
        <p>
          Você pode continuar adicionando itens a qualquer momento. Para solicitar a conta, basta avisar o garçom ou pedir o fechamento no balcão.
        </p>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <PrimaryButton variant="secondary" fullWidth on:click={onClose}>
        Continuar Pedindo no Cardápio
      </PrimaryButton>
    </svelte:fragment>
  </Modal>
{/if}
