<script lang="ts">
  import { tableSessionStore, isTableMode, tableNumber, comandaTotalFormatted } from '$stores/tableSessionStore';
  import Icon from '$components/Icon.svelte';

  export let onOpenComanda: () => void = () => {};

  let showExitConfirm = false;

  function handleExitTable() {
    tableSessionStore.clearTableSession();
    showExitConfirm = false;
  }
</script>

{#if $isTableMode && $tableNumber}
  <div class="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 p-3 shadow-md border-b-2 border-amber-800 font-mono text-xs">
    <div class="max-w-2xl mx-auto flex items-center justify-between gap-3">
      <!-- Identificação da Mesa -->
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 bg-slate-950 text-amber-400 border border-amber-400 font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
          {$tableNumber < 10 ? `0${$tableNumber}` : $tableNumber}
        </div>
        <div class="leading-tight">
          <div class="font-extrabold text-xs tracking-wider uppercase text-slate-950 flex items-center gap-1.5">
            <span>MESA {$tableNumber}</span>
            <span class="px-1.5 py-0.2 bg-slate-950 text-white text-[9px] font-bold uppercase rounded-none">
              SALÃO
            </span>
          </div>
          <span class="text-[10px] text-amber-950 font-bold block">
            🔒 QR Code Validado · Sem Taxa de Entrega
          </span>
        </div>
      </div>

      <!-- Botão de Comanda & Sair -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          class="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 font-bold text-[10px] uppercase transition-all duration-150 cursor-pointer shadow-xs border border-amber-400 flex items-center gap-1"
          on:click={onOpenComanda}
        >
          <span>📋</span>
          <span>Ver Comanda</span>
        </button>

        <button
          type="button"
          class="p-1.5 bg-amber-800/40 hover:bg-amber-900 hover:text-white text-amber-950 text-[10px] font-bold uppercase transition-colors cursor-pointer border border-amber-800/60"
          on:click={() => showExitConfirm = true}
          title="Desconectar da Mesa"
        >
          ✕
        </button>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação de Saída da Mesa -->
  {#if showExitConfirm}
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
      <div class="bg-white border-2 border-slate-900 p-5 max-w-xs w-full space-y-4 shadow-xl text-center">
        <div class="text-3xl">🪑</div>
        <div class="space-y-1">
          <h3 class="font-bold text-sm uppercase text-slate-900">Desconectar da Mesa {$tableNumber}?</h3>
          <p class="text-xs text-slate-600 font-sans">
            Ao sair da mesa, o cardápio voltará para a modalidade padrão de Delivery e Retirada.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            class="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase cursor-pointer"
            on:click={() => showExitConfirm = false}
          >
            Permanecer
          </button>
          <button
            type="button"
            class="py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase cursor-pointer"
            on:click={handleExitTable}
          >
            Sair da Mesa
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}
