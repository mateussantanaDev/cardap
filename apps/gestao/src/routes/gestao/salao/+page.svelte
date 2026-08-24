<script lang="ts">
  import { tableStore, type TableStatusType, type SaloonTable } from '$stores/tableStore';
  import MesaCard from '$components/salao/MesaCard.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import Icon from '$components/Icon.svelte';

  import ModalNovaMesa from '$components/salao/ModalNovaMesa.svelte';
  import ModalComandaDetails from '$components/comanda/ModalComandaDetails.svelte';
  import ModalImprimirQrMesa from '$components/salao/ModalImprimirQrMesa.svelte';

  import { onMount } from 'svelte';

  export let data: any = {};

  let filterStatus: 'TODAS' | TableStatusType = 'TODAS';
  let isNovaMesaModalOpen = false;

  let selectedTableOrder: any = null;
  let isComandaModalOpen = false;

  let selectedTableForQr: SaloonTable | null = null;
  let isQrModalOpen = false;

  $: if (data?.tables && data.tables.length > 0) {
    tableStore.set(data.tables);
  }

  $: filteredTables = $tableStore.filter(
    (t: SaloonTable) => filterStatus === 'TODAS' || t.status === filterStatus
  );

  $: countLivre = $tableStore.filter((t: SaloonTable) => t.status === 'LIVRE').length;
  $: countOcupada = $tableStore.filter((t: SaloonTable) => t.status === 'OCUPADA').length;
  $: countConta = $tableStore.filter((t: SaloonTable) => t.status === 'CONTA_SOLICITADA').length;

  $: totalSaloonCents = $tableStore.reduce((acc: number, t: SaloonTable) => acc + (t.activeOrderTotalCents || 0), 0);
  $: totalSaloonFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSaloonCents / 100);

  function handleOpenComandaDetails(table: SaloonTable) {
    selectedTableOrder = {
      orderNumber: `MESA-${table.number < 10 ? `0${table.number}` : table.number}`,
      type: 'SALAO',
      status: table.status,
      tableNumber: table.number,
      totalAmountFormatted: table.activeOrderTotalFormatted || 'R$ 0,00',
      items: table.items || []
    };
    isComandaModalOpen = true;
  }

  function handleOpenPrintQr(table: SaloonTable) {
    selectedTableForQr = table;
    isQrModalOpen = true;
  }

  async function reloadTables() {
    try {
      const res = await fetch('/api/tables', { credentials: 'include' });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.tables) {
          tableStore.set(resData.tables);
        }
      }
    } catch {}
  }

  onMount(() => {
    reloadTables();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ORDER_CREATED' || payload.type === 'ORDER_STATUS_UPDATED' || payload.type === 'TABLE_UPDATED') {
            reloadTables();
          }
        } catch (e) {}
      };
    } catch (e) {}

    const interval = setInterval(reloadTables, 8000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  });
</script>

<div class="space-y-6">
  <!-- PanelHeader do Mapa de Salão -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Mapa de Salão & Mesas"
      subtitle="Gestão visual de comandas presenciais e QR Code criptográfico anti-fraude em tempo real"
      index="05"
    >
      <div class="flex items-center gap-3">
        <div class="px-3 py-1 bg-slate-50 border border-slate-200 font-mono text-xs">
          <span class="text-[10px] text-slate-500 uppercase font-bold block">Consumo Aberto:</span>
          <span class="text-base font-extrabold text-red-600">{totalSaloonFormatted}</span>
        </div>

        <button
          type="button"
          class="p-2 border border-slate-300 bg-white hover:bg-slate-50 font-mono text-xs text-slate-700 cursor-pointer"
          on:click={reloadTables}
          title="Atualizar Mesas"
        >
          🔄
        </button>

        <PrimaryButton variant="primary" shortcut="N" on:click={() => isNovaMesaModalOpen = true}>
          <Icon name="plus" size={14} className="mr-1" />
          Nova Mesa
        </PrimaryButton>
      </div>
    </PanelHeader>
  </div>

  <!-- Barra de Filtros de Status -->
  <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-3 border border-slate-200 font-mono text-xs">
    <div class="flex items-center gap-1.5">
      <button
        class="px-3 py-1 font-bold uppercase rounded-none border transition-colors cursor-pointer {filterStatus === 'TODAS' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
        on:click={() => filterStatus = 'TODAS'}
      >
        Todas ({$tableStore.length})
      </button>

      <button
        class="px-3 py-1 font-bold uppercase rounded-none border transition-colors cursor-pointer {filterStatus === 'LIVRE' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
        on:click={() => filterStatus = 'LIVRE'}
      >
        Livres ({countLivre})
      </button>

      <button
        class="px-3 py-1 font-bold uppercase rounded-none border transition-colors cursor-pointer {filterStatus === 'OCUPADA' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
        on:click={() => filterStatus = 'OCUPADA'}
      >
        Ocupadas ({countOcupada})
      </button>

      <button
        class="px-3 py-1 font-bold uppercase rounded-none border transition-colors cursor-pointer {filterStatus === 'CONTA_SOLICITADA' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
        on:click={() => filterStatus = 'CONTA_SOLICITADA'}
      >
        Conta Solicitada ({countConta})
      </button>
    </div>

    <span class="text-[11px] text-slate-500 uppercase tracking-widest hidden md:inline font-mono">
      🔒 QR Tokens Assinados via HMAC-SHA256
    </span>
  </div>

  <!-- Grid Visual das Mesas -->
  {#if filteredTables.length === 0}
    <div class="p-8 bg-white border-2 border-dashed border-slate-200 text-center space-y-3">
      <div class="text-3xl">🪑</div>
      <div class="font-bold text-slate-800 text-sm font-mono uppercase">Nenhuma mesa cadastrada no salão</div>
      <p class="text-slate-500 font-sans text-xs max-w-sm mx-auto">
        Clique em "Nova Mesa" acima para cadastrar a numeração e capacidade das mesas do seu restaurante.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {#each filteredTables as table (table.id)}
        <MesaCard
          {table}
          onOpenDetails={() => handleOpenComandaDetails(table)}
          onPrintQr={() => handleOpenPrintQr(table)}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Modais do Salão -->
<ModalNovaMesa
  isOpen={isNovaMesaModalOpen}
  onClose={() => isNovaMesaModalOpen = false}
  onCreated={reloadTables}
/>

<ModalComandaDetails
  isOpen={isComandaModalOpen}
  order={selectedTableOrder}
  onClose={() => isComandaModalOpen = false}
  onPaymentDone={() => {
    if (selectedTableOrder?.tableNumber) {
      const table = $tableStore.find(t => t.number === selectedTableOrder.tableNumber);
      if (table) tableStore.closeTable(table.id);
    }
  }}
/>

<ModalImprimirQrMesa
  isOpen={isQrModalOpen}
  table={selectedTableForQr}
  restaurant={data?.restaurant}
  onClose={() => isQrModalOpen = false}
/>
