<script lang="ts">
  import type { SaloonTable } from '$stores/tableStore';
  import { tableStore } from '$stores/tableStore';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Icon from '$components/Icon.svelte';

  export let table: SaloonTable;
  export let onOpenDetails: () => void = () => {};
  export let onPrintQr: () => void = () => {};

  function formatOccupiedTime(date?: Date): string {
    if (!date) return '';
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    return `Há ${mins} min`;
  }
</script>

<div
  class="rounded-none border p-4 flex flex-col justify-between transition-all duration-150 {table.status === 'OCUPADA'
    ? 'bg-amber-50/80 border-2 border-amber-500'
    : table.status === 'CONTA_SOLICITADA'
    ? 'bg-red-50/90 border-2 border-red-600 animate-pulse'
    : 'bg-white border-slate-300'}"
>
  <div>
    <!-- Card Header -->
    <div class="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
      <span class="font-mono text-base font-extrabold tracking-widest text-slate-900 flex items-center gap-1.5">
        <Icon name="table" size={16} className="text-slate-600" />
        MESA {table.number < 10 ? `0${table.number}` : table.number}
      </span>
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[10px] font-bold uppercase transition-colors cursor-pointer"
          on:click={onPrintQr}
          title="Imprimir Placa / QR Code da Mesa"
        >
          🖨️ QR
        </button>
        <StatusBadge status={table.status} />
      </div>
    </div>

    <!-- Details -->
    <div class="space-y-1 font-mono text-xs text-slate-600">
      <div class="flex justify-between">
        <span>Capacidade:</span>
        <strong class="text-slate-900">{table.capacity} pessoas</strong>
      </div>

      {#if table.status !== 'LIVRE'}
        <div class="flex justify-between">
          <span>Permanência:</span>
          <strong class="text-slate-900">{formatOccupiedTime(table.occupiedSince)}</strong>
        </div>

        <div class="flex justify-between">
          <span>Comandas:</span>
          <strong class="text-slate-900">{table.activeOrdersCount || 0} ativas</strong>
        </div>

        <!-- Subtotal Parcial da Mesa em red-600 -->
        <div class="mt-3 pt-2 border-t border-slate-200 flex flex-col">
          <span class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Consumo Parcial:</span>
          <span class="font-mono text-lg font-extrabold text-red-600">{table.activeOrderTotalFormatted}</span>
        </div>
      {:else}
        <div class="py-4 text-center text-slate-400 font-mono text-xs uppercase tracking-wider">
          Mesa disponível para atendimento
        </div>
      {/if}
    </div>
  </div>

  <!-- Actions -->
  <div class="mt-4 pt-3 border-t border-slate-200 space-y-2">
    {#if table.status === 'LIVRE'}
      <div class="grid grid-cols-2 gap-2">
        <PrimaryButton variant="primary" size="sm" on:click={() => tableStore.openTable(table.id)}>
          Abrir Comanda
        </PrimaryButton>
        <PrimaryButton variant="secondary" size="sm" on:click={onPrintQr}>
          Imprimir QR
        </PrimaryButton>
      </div>
    {:else if table.status === 'OCUPADA'}
      <div class="grid grid-cols-2 gap-2">
        <PrimaryButton variant="secondary" size="sm" on:click={onOpenDetails}>
          Ver Comanda
        </PrimaryButton>
        <PrimaryButton variant="accent" size="sm" on:click={onOpenDetails}>
          Fechar Conta
        </PrimaryButton>
      </div>
    {:else if table.status === 'CONTA_SOLICITADA'}
      <PrimaryButton variant="primary" size="sm" fullWidth on:click={() => tableStore.closeTable(table.id)}>
        Receber & Liberar
      </PrimaryButton>
    {/if}
  </div>
</div>
