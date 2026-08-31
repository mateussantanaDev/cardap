<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import { soundAlert } from '$lib/utils/soundAlert';

  export let data: any;

  let tables: any[] = data?.tables || [];
  let categories: any[] = data?.categories || [];
  let user: any = data?.user || null;
  let restaurant: any = data?.restaurant || null;

  let activeFilter: 'TODOS' | 'LIVRE' | 'OCUPADA' | 'CONTA_SOLICITADA' = 'TODOS';
  let searchTerm = '';
  let isRefreshing = false;
  let pollingInterval: any = null;
  let toastMessage = '';
  let toastType: 'success' | 'error' | 'info' = 'success';

  // Estado da Mesa Selecionada
  let selectedTable: any = null;
  let isTableModalOpen = false;

  // Estado do Lançamento de Pedidos (Catálogo do Garçom)
  let isCatalogOpen = false;
  let selectedCategory: string = 'TODOS';
  let productSearchTerm = '';
  let trayItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    destinationSector: string;
    notes: string;
  }> = [];

  let isSubmittingOrder = false;

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    toastMessage = msg;
    toastType = type;
    setTimeout(() => {
      if (toastMessage === msg) toastMessage = '';
    }, 4500);
  }

  async function loadTablesData() {
    try {
      isRefreshing = true;
      const res = await fetch('/api/tables', { credentials: 'include' });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.tables) {
          tables = resData.tables;
          // Se houver mesa selecionada, atualiza seus dados
          if (selectedTable) {
            const updated = tables.find(t => t.id === selectedTable.id);
            if (updated) selectedTable = updated;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar mesas do garçom:', e);
    } finally {
      isRefreshing = false;
    }
  }

  onMount(() => {
    loadTablesData();
    pollingInterval = setInterval(loadTablesData, 4000);
  });

  onDestroy(() => {
    if (pollingInterval) clearInterval(pollingInterval);
  });

  // Filtro de Mesas
  $: filteredTables = tables.filter(t => {
    const matchesFilter = activeFilter === 'TODOS' || t.status === activeFilter;
    const matchesSearch = !searchTerm.trim() ||
      String(t.number).includes(searchTerm.trim()) ||
      `mesa ${t.number}`.includes(searchTerm.toLowerCase().trim());
    return matchesFilter && matchesSearch;
  });

  $: freeCount = tables.filter(t => t.status === 'LIVRE').length;
  $: occupiedCount = tables.filter(t => t.status === 'OCUPADA').length;
  $: billRequestedCount = tables.filter(t => t.status === 'CONTA_SOLICITADA').length;

  // Produtos filtrados no catálogo
  $: allProducts = categories.flatMap(c => c.products.map((p: any) => ({ ...p, categoryName: c.name })));
  
  $: filteredProducts = allProducts.filter((p: any) => {
    const matchesCat = selectedCategory === 'TODOS' || p.categoryName === selectedCategory;
    const matchesSearch = !productSearchTerm.trim() ||
      p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(productSearchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Totais da Bandeja do Garçom
  $: trayTotalCents = trayItems.reduce((acc, it) => acc + Math.round(it.totalPrice * 100), 0);
  $: trayTotalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trayTotalCents / 100);
  $: trayTotalQuantity = trayItems.reduce((acc, it) => acc + it.quantity, 0);

  function openTableSheet(table: any) {
    selectedTable = table;
    isTableModalOpen = true;
    isCatalogOpen = false;
    trayItems = [];
  }

  function closeTableSheet() {
    isTableModalOpen = false;
    isCatalogOpen = false;
    selectedTable = null;
    trayItems = [];
  }

  function openCatalogForTable() {
    isCatalogOpen = true;
    selectedCategory = 'TODOS';
    productSearchTerm = '';
  }

  function addItemToTray(product: any) {
    const existingIndex = trayItems.findIndex(it => it.productId === product.id && !it.notes);
    if (existingIndex >= 0) {
      trayItems[existingIndex].quantity += 1;
      trayItems[existingIndex].totalPrice = trayItems[existingIndex].quantity * trayItems[existingIndex].unitPrice;
      trayItems = [...trayItems];
    } else {
      trayItems = [
        ...trayItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
          destinationSector: product.destinationSector || 'COZINHA',
          notes: ''
        }
      ];
    }
    soundAlert.playBeep();
  }

  function incrementTrayItem(index: number) {
    trayItems[index].quantity += 1;
    trayItems[index].totalPrice = trayItems[index].quantity * trayItems[index].unitPrice;
    trayItems = [...trayItems];
  }

  function decrementTrayItem(index: number) {
    if (trayItems[index].quantity > 1) {
      trayItems[index].quantity -= 1;
      trayItems[index].totalPrice = trayItems[index].quantity * trayItems[index].unitPrice;
      trayItems = [...trayItems];
    } else {
      trayItems = trayItems.filter((_, i) => i !== index);
    }
  }

  function updateItemNotes(index: number) {
    const current = trayItems[index].notes || '';
    const newNotes = prompt(`Observação para "${trayItems[index].productName}":`, current);
    if (newNotes !== null) {
      trayItems[index].notes = newNotes.trim();
      trayItems = [...trayItems];
    }
  }

  async function handleSendOrder() {
    if (!selectedTable || trayItems.length === 0 || isSubmittingOrder) return;

    isSubmittingOrder = true;

    try {
      const payload = {
        type: 'SALAO',
        tableId: selectedTable.id,
        tableNumber: selectedTable.number,
        customerName: `Mesa ${selectedTable.number}`,
        paymentMethod: 'BALCAO',
        paymentStatus: 'PENDENTE',
        items: trayItems.map(it => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          notes: it.notes || undefined,
          sector: it.destinationSector
        }))
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        soundAlert.playNewOrderAlert();
        showToast(`✓ Pedido #${data.order?.orderNumber || ''} enviado para a Mesa ${selectedTable.number}!`, 'success');
        trayItems = [];
        isCatalogOpen = false;
        await loadTablesData();
      } else {
        showToast(data.error || 'Erro ao lançar pedido na mesa.', 'error');
      }
    } catch (e: any) {
      showToast(`Falha na requisição: ${e.message}`, 'error');
    } finally {
      isSubmittingOrder = false;
    }
  }

  async function handleRequestBill() {
    if (!selectedTable) return;
    if (!confirm(`Deseja solicitar o fechamento da conta para a Mesa ${selectedTable.number}?`)) return;

    try {
      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: selectedTable.id, status: 'CONTA_SOLICITADA' })
      });

      if (res.ok) {
        showToast(`✓ Conta da Mesa ${selectedTable.number} solicitada ao Caixa!`, 'success');
        await loadTablesData();
        closeTableSheet();
      } else {
        showToast('Erro ao solicitar conta da mesa.', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
</script>

<!-- Shell Mobile-First para Garçom -->
<div class="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 select-none pb-20">
  
  <!-- Header Mobile Fixo -->
  <header class="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b-2 border-red-600 px-4 py-3">
    <div class="flex items-center justify-between gap-3">
      <!-- Identificação do Garçom -->
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-base shadow shrink-0">
          🍽️
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <h1 class="font-mono text-sm font-extrabold tracking-wide uppercase">App do Garçom</h1>
            <span class="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase rounded">
              AO VIVO
            </span>
          </div>
          <p class="text-[11px] text-slate-300 font-mono flex items-center gap-1 truncate max-w-[200px]">
            <span>👤 {user?.name || 'Garçom'}</span>
            <span class="text-slate-500">•</span>
            <span class="text-slate-400">{restaurant?.name || 'Salão'}</span>
          </p>
        </div>
      </div>

      <!-- Ações do Header: Atualizar & Sair -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          on:click={loadTablesData}
          disabled={isRefreshing}
          class="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
          title="Atualizar Mesas"
        >
          <span class={isRefreshing ? 'animate-spin inline-block' : ''}>🔄</span>
        </button>

        <button
          type="button"
          on:click={handleLogout}
          class="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 font-mono text-xs font-bold uppercase rounded flex items-center gap-1 transition-colors cursor-pointer"
          title="Sair do Sistema"
        >
          <span>Sair</span>
          <span>🚪</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Toast Notificação Flutuante -->
  {#if toastMessage}
    <div class="fixed top-16 inset-x-4 z-50 flex justify-center animate-bounce">
      <div class="px-4 py-2.5 rounded shadow-lg font-mono text-xs font-bold uppercase flex items-center gap-2 border {toastType === 'success' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-red-600 text-white border-red-700'}">
        <span>{toastType === 'success' ? '✓' : '⚠️'}</span>
        <span>{toastMessage}</span>
      </div>
    </div>
  {/if}

  <!-- Barra de Busca & Filtros Rápidos das Mesas -->
  <section class="p-3 bg-white border-b border-slate-200 space-y-2.5">
    <!-- Input de Busca Rápida por Número -->
    <div class="relative">
      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
        🔍
      </span>
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Buscar número da mesa (ex: 4, 12)..."
        class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono text-sm placeholder:text-slate-400 focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
      />
    </div>

    <!-- Chips de Filtro Rápido (Touch-Friendly) -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
      <button
        type="button"
        on:click={() => activeFilter = 'TODOS'}
        class="px-3 py-1.5 rounded font-bold uppercase whitespace-nowrap border transition-colors cursor-pointer {activeFilter === 'TODOS' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}"
      >
        Todas ({tables.length})
      </button>

      <button
        type="button"
        on:click={() => activeFilter = 'LIVRE'}
        class="px-3 py-1.5 rounded font-bold uppercase whitespace-nowrap border transition-colors cursor-pointer {activeFilter === 'LIVRE' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'}"
      >
        🟢 Livres ({freeCount})
      </button>

      <button
        type="button"
        on:click={() => activeFilter = 'OCUPADA'}
        class="px-3 py-1.5 rounded font-bold uppercase whitespace-nowrap border transition-colors cursor-pointer {activeFilter === 'OCUPADA' ? 'bg-amber-600 text-white border-amber-700' : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'}"
      >
        🟡 Ocupadas ({occupiedCount})
      </button>

      {#if billRequestedCount > 0}
        <button
          type="button"
          on:click={() => activeFilter = 'CONTA_SOLICITADA'}
          class="px-3 py-1.5 rounded font-bold uppercase whitespace-nowrap border transition-colors cursor-pointer {activeFilter === 'CONTA_SOLICITADA' ? 'bg-blue-600 text-white border-blue-700 animate-pulse' : 'bg-blue-50 text-blue-900 border-blue-300'}"
        >
          🔵 Pediram Conta ({billRequestedCount})
        </button>
      {/if}
    </div>
  </section>

  <!-- Grid Responsivo de Mesas do Salão -->
  <main class="p-3 flex-1">
    {#if filteredTables.length === 0}
      <div class="p-8 text-center bg-white border border-slate-200 rounded mt-4 space-y-2">
        <div class="text-4xl">🍽️</div>
        <h3 class="font-mono text-sm font-bold text-slate-800 uppercase">Nenhuma mesa encontrada</h3>
        <p class="text-xs text-slate-500 font-sans">
          {searchTerm ? `Nenhum resultado para "${searchTerm}".` : 'Não há mesas cadastradas para o filtro selecionado.'}
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {#each filteredTables as table (table.id)}
          <button
            type="button"
            on:click={() => openTableSheet(table)}
            class="p-3.5 rounded border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-xs active:scale-95 {table.status === 'LIVRE'
              ? 'bg-white hover:bg-emerald-50/60 border-slate-300 hover:border-emerald-500'
              : table.status === 'OCUPADA'
              ? 'bg-amber-50/80 border-amber-400 hover:bg-amber-100/90 shadow-sm'
              : 'bg-blue-50 border-blue-400 hover:bg-blue-100'}"
          >
            <!-- Topo do Card: Número da Mesa & Badge -->
            <div class="flex items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
              <span class="font-mono text-base font-extrabold text-slate-900">
                Mesa {String(table.number).padStart(2, '0')}
              </span>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase {table.status === 'LIVRE'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : table.status === 'OCUPADA'
                ? 'bg-amber-200 text-amber-950 border-amber-400'
                : 'bg-blue-100 text-blue-900 border-blue-300'}">
                {table.status === 'LIVRE' ? 'Livre' : (table.status === 'OCUPADA' ? 'Ocupada' : 'Conta')}
              </span>
            </div>

            <!-- Centro do Card: Informações da Mesa -->
            <div class="py-2.5 space-y-1 font-mono text-xs">
              {#if table.status === 'LIVRE'}
                <div class="text-[11px] text-slate-400 font-sans">
                  {table.capacity || 4} lugares disponíveis
                </div>
                <div class="text-emerald-700 text-xs font-bold font-mono">
                  + Toque para Abrir
                </div>
              {:else}
                <div class="text-[11px] text-slate-500 font-sans flex items-center justify-between">
                  <span>Itens: <strong>{table.items?.length || 0}</strong></span>
                  <span>{table.activeOrdersCount || 1} pedido(s)</span>
                </div>
                <div class="text-sm font-extrabold text-red-600 font-mono pt-0.5">
                  {table.activeOrderTotalFormatted || 'R$ 0,00'}
                </div>
              {/if}
            </div>

            <!-- Rodapé do Card: Ação Rápida -->
            <div class="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span>{table.status === 'LIVRE' ? 'Disponível' : 'Ver Comanda'}</span>
              <span>➔</span>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </main>

  <!-- ========================================================================= -->
  <!-- MODAL / GAVETA DA COMANDA DA MESA                                          -->
  <!-- ========================================================================= -->
  {#if isTableModalOpen && selectedTable}
    <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      <div class="bg-white w-full sm:max-w-lg rounded-t-xl sm:rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-t-4 sm:border border-slate-900">
        
        <!-- Header da Comanda da Mesa -->
        <div class="p-4 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded bg-red-600 flex items-center justify-center font-mono font-extrabold text-base text-white shadow">
              #{String(selectedTable.number).padStart(2, '0')}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-mono text-sm font-extrabold uppercase">Mesa {selectedTable.number} — Comanda</h2>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase {selectedTable.status === 'LIVRE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}">
                  {selectedTable.status === 'LIVRE' ? 'LIVRE' : 'EM ATENDIMENTO'}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 font-sans">
                {selectedTable.items?.length || 0} item(s) lançados • Salão Presencial
              </p>
            </div>
          </div>

          <button
            type="button"
            on:click={closeTableSheet}
            class="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Conteúdo da Comanda da Mesa -->
        <div class="p-4 overflow-y-auto flex-1 space-y-4 font-mono text-xs">
          
          <!-- Banner de Total Acumulado -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <span class="text-slate-500 uppercase font-bold text-[11px]">Total Acumulado da Mesa:</span>
            <span class="font-mono text-base font-extrabold text-red-600">
              {selectedTable.activeOrderTotalFormatted || 'R$ 0,00'}
            </span>
          </div>

          <!-- Lista de Itens Já Lançados na Comanda -->
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
              Extrato da Mesa ({selectedTable.items?.length || 0} itens):
            </span>

            {#if !selectedTable.items || selectedTable.items.length === 0}
              <div class="p-6 border-2 border-dashed border-slate-200 rounded text-center space-y-1 bg-slate-50">
                <div class="text-2xl">🧾</div>
                <div class="font-bold text-slate-700 text-xs">Nenhum item lançado ainda</div>
                <p class="text-[11px] text-slate-500 font-sans">
                  Toque no botão abaixo para escolher pratos, lanches ou bebidas.
                </p>
              </div>
            {:else}
              <div class="divide-y divide-slate-100 border border-slate-200 rounded bg-white max-h-60 overflow-y-auto">
                {#each selectedTable.items as item}
                  <div class="p-2.5 flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-900">{item.qty}x {item.name}</span>
                        <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase {item.sector === 'BEBIDA' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'}">
                          {item.sector === 'BEBIDA' ? '🥤 Bebida' : '🍳 Cozinha'}
                        </span>
                      </div>
                      {#if item.notes}
                        <div class="text-[10px] text-amber-800 italic mt-0.5">
                          Obs: {item.notes}
                        </div>
                      {/if}
                    </div>
                    <div class="font-bold text-slate-900 text-right shrink-0">
                      {item.priceFormatted}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Rodapé da Gaveta da Mesa: Ações do Garçom -->
        <div class="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <!-- Botão Principal: Lançar / Adicionar Itens -->
          <button
            type="button"
            on:click={openCatalogForTable}
            class="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-mono text-sm font-extrabold uppercase rounded tracking-wider shadow transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🍽️ + Adicionar Itens / Fazer Pedido</span>
          </button>

          <!-- Ações Secundárias da Mesa -->
          {#if selectedTable.status !== 'LIVRE' && selectedTable.items?.length > 0}
            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                on:click={handleRequestBill}
                class="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-mono text-xs font-bold uppercase rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <span>💳 Pedir Conta</span>
              </button>

              <button
                type="button"
                on:click={closeTableSheet}
                class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-xs font-bold uppercase rounded transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- ========================================================================= -->
  <!-- MODAL / GAVETA DO CARDÁPIO & LANÇAMENTO DE ITENS                          -->
  <!-- ========================================================================= -->
  {#if isCatalogOpen && selectedTable}
    <div class="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      <div class="bg-white w-full sm:max-w-2xl rounded-t-xl sm:rounded-lg shadow-2xl flex flex-col h-[94vh] sm:h-[88vh] overflow-hidden border-t-4 sm:border border-red-600">
        
        <!-- Header do Catálogo -->
        <div class="p-3 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <button
              type="button"
              on:click={() => isCatalogOpen = false}
              class="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-xs font-bold uppercase"
            >
              ⬅ Voltar
            </button>
            <div>
              <h3 class="font-mono text-sm font-extrabold uppercase">
                Lançar na Mesa {selectedTable.number}
              </h3>
              <p class="text-[10px] text-slate-300 font-sans">
                Toque nos produtos para adicionar à comanda
              </p>
            </div>
          </div>

          <button
            type="button"
            on:click={() => isCatalogOpen = false}
            class="p-1.5 text-slate-400 hover:text-white text-base"
          >
            ✕
          </button>
        </div>

        <!-- Barra de Busca de Produtos & Seletor de Categorias -->
        <div class="p-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
          <!-- Campo de Busca Rápida -->
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              bind:value={productSearchTerm}
              placeholder="Digite o nome do produto (ex: pastel, coca, cerveja)..."
              class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs placeholder:text-slate-400 focus:border-red-600"
            />
          </div>

          <!-- Carrossel Horizontal de Categorias -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
            <button
              type="button"
              on:click={() => selectedCategory = 'TODOS'}
              class="px-2.5 py-1 rounded font-bold uppercase whitespace-nowrap border transition-colors cursor-pointer {selectedCategory === 'TODOS' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300'}"
            >
              Todos
            </button>
            {#each categories as cat}
              <button
                type="button"
                on:click={() => selectedCategory = cat.name}
                class="px-2.5 py-1 rounded font-bold uppercase whitespace-nowrap border transition-colors cursor-pointer {selectedCategory === cat.name ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300'}"
              >
                {cat.name}
              </button>
            {/each}
          </div>
        </div>

        <!-- Lista de Produtos para Lançamento -->
        <div class="p-3 overflow-y-auto flex-1 space-y-2">
          {#if filteredProducts.length === 0}
            <div class="p-8 text-center text-slate-400 font-mono text-xs uppercase bg-slate-50 border border-dashed border-slate-200 rounded">
              Nenhum produto encontrado.
            </div>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {#each filteredProducts as prod}
                <div class="p-2.5 bg-white border border-slate-200 rounded flex items-center justify-between gap-2 shadow-2xs hover:border-slate-400 transition-all">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-slate-900 text-xs truncate">{prod.name}</span>
                      <span class="text-[9px] font-mono font-bold px-1 py-0.2 rounded border uppercase {prod.destinationSector === 'BEBIDA_BALCAO' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'}">
                        {prod.destinationSector === 'BEBIDA_BALCAO' ? '🥤 Bebida' : '🍳 Cozinha'}
                      </span>
                    </div>
                    {#if prod.description}
                      <p class="text-[10px] text-slate-500 font-sans line-clamp-1 mt-0.5">{prod.description}</p>
                    {/if}
                    <div class="font-mono font-bold text-xs text-red-600 mt-1">
                      {prod.priceFormatted}
                    </div>
                  </div>

                  <button
                    type="button"
                    on:click={() => addItemToTray(prod)}
                    class="px-3 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-mono text-xs font-extrabold uppercase rounded shadow transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>+ Adicionar</span>
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Bandeja do Garçom / Itens Selecionados Nesta Rodada -->
        {#if trayItems.length > 0}
          <div class="p-3 bg-slate-900 text-white border-t border-slate-800 space-y-2.5 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="font-mono text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                <span>🛒 Bandeja do Garçom</span>
                <span class="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full">
                  {trayTotalQuantity}
                </span>
              </span>
              <span class="font-mono text-sm font-extrabold text-emerald-400">
                {trayTotalFormatted}
              </span>
            </div>

            <!-- Lista de Itens na Bandeja -->
            <div class="max-h-32 overflow-y-auto divide-y divide-slate-800 space-y-1.5 text-xs font-mono">
              {#each trayItems as item, idx}
                <div class="pt-1.5 flex items-center justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="truncate text-slate-100 font-bold">{item.productName}</div>
                    {#if item.notes}
                      <div class="text-[10px] text-amber-300 truncate">Obs: {item.notes}</div>
                    {/if}
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      on:click={() => updateItemNotes(idx)}
                      class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] rounded border border-slate-700"
                      title="Adicionar observação"
                    >
                      ✏️ Obs
                    </button>

                    <div class="flex items-center gap-1 bg-slate-800 rounded border border-slate-700 px-1">
                      <button
                        type="button"
                        on:click={() => decrementTrayItem(idx)}
                        class="px-1.5 py-0.5 text-slate-300 hover:text-white font-bold"
                      >
                        -
                      </button>
                      <span class="px-1 font-bold text-white text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        on:click={() => incrementTrayItem(idx)}
                        class="px-1.5 py-0.5 text-slate-300 hover:text-white font-bold"
                      >
                        +
                      </button>
                    </div>

                    <span class="font-bold text-slate-200 min-w-[60px] text-right">
                      R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Botão de Envio para Cozinha / Bar -->
            <button
              type="button"
              disabled={isSubmittingOrder}
              on:click={handleSendOrder}
              class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-mono text-sm font-extrabold uppercase rounded tracking-wider shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {#if isSubmittingOrder}
                <span>Enviando Pedido...</span>
              {:else}
                <span>🚀 ENVIAR PEDIDO PARA A COZINHA / BAR</span>
              {/if}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
