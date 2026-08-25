<script lang="ts">
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import Icon from '$components/Icon.svelte';
  import ThermalPrintModal from '$components/ui/ThermalPrintModal.svelte';
  import { PrinterService, type PrintableOrder } from '$services/printerService';

  import { onMount } from 'svelte';

  export let data: any = {};

  // Modo de operação do PDV
  let activeTab: 'CATALOGO' | 'MESAS' = 'CATALOGO';

  // Catálogo & Busca
  let categories: string[] = ['TODOS'];
  let selectedCategory = 'TODOS';
  let searchQuery = '';
  let products: any[] = [];

  // Mesas do Salão
  let tables: any[] = [];
  let filterTableStatus: 'TODAS' | 'OCUPADA' | 'CONTA_SOLICITADA' | 'LIVRE' = 'TODAS';
  let selectedTable: any = null;

  // Pagamento & Carrinho
  let paymentMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' = 'DINHEIRO';
  let cashGivenInput = '';
  let receiptModalOpen = false;
  let printableOrderData: any = null;
  let receiptText = '';
  let isCheckingOut = false;
  let checkoutFeedback = '';

  interface CartItem {
    id: string;
    productId: string;
    name: string;
    priceCents: number;
    quantity: number;
    notes?: string;
  }

  let cart: CartItem[] = [];

  $: if (data?.categories && data.categories.length > 0) {
    categories = data.categories;
  }
  $: if (data?.products && data.products.length > 0) {
    products = data.products;
  }
  $: if (data?.tables) {
    tables = data.tables;
  }

  async function loadCatalog() {
    try {
      const res = await fetch('/api/catalog?channel=B2B');
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.categories) {
          const list: any[] = [];
          for (const cat of d.categories) {
            for (const prod of cat.products || []) {
              list.push({
                id: prod.id,
                code: prod.code || 'PROD',
                category: cat.slug.toUpperCase(),
                name: prod.name,
                priceCents: prod.priceCents !== undefined ? Number(prod.priceCents) : Math.round(Number(prod.price || 0) * 100)
              });
            }
          }
          if (list.length > 0) {
            products = list;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar catálogo no PDV:', e);
    }
  }

  async function loadTables() {
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.tables) {
          tables = d.tables;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar mesas no PDV:', e);
    }
  }

  onMount(() => {
    loadCatalog();
    loadTables();
  });

  // Filtros de Produtos
  $: filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'TODOS' || p.category.includes(selectedCategory);
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Filtros de Mesas
  $: filteredTables = tables.filter(t => {
    if (filterTableStatus === 'TODAS') return true;
    return t.status === filterTableStatus;
  });

  $: countOcupadas = tables.filter(t => t.status === 'OCUPADA' || t.status === 'CONTA_SOLICITADA').length;
  $: countConta = tables.filter(t => t.status === 'CONTA_SOLICITADA').length;
  $: countLivres = tables.filter(t => t.status === 'LIVRE').length;

  // Cálculos de Totais
  $: subtotalCents = cart.reduce((acc, item) => acc + (item.priceCents * item.quantity), 0);
  $: totalCents = subtotalCents;

  $: cashGivenVal = parseFloat(cashGivenInput.replace(',', '.')) || 0;
  $: changeCents = Math.max(0, Math.round(cashGivenVal * 100) - totalCents);

  const fmt = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

  function addToCart(product: typeof products[0]) {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      cart = cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      cart = [...cart, { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, productId: product.id, name: product.name, priceCents: product.priceCents, quantity: 1 }];
    }
  }

  function updateItemQty(id: string, delta: number) {
    cart = cart.map(i => {
      if (i.id === id) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : null;
      }
      return i;
    }).filter(Boolean) as CartItem[];
  }

  function clearCart() {
    cart = [];
    cashGivenInput = '';
    selectedTable = null;
    checkoutFeedback = '';
  }

  // Puxar Consumo da Mesa para o PDV
  function handleSelectTable(table: any) {
    selectedTable = table;
    checkoutFeedback = '';

    if (table.items && table.items.length > 0) {
      cart = table.items.map((it: any) => ({
        id: it.id || `c-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productId: it.productId || it.id,
        name: it.name,
        priceCents: it.priceCents,
        quantity: it.quantity,
        notes: it.notes
      }));
    } else {
      cart = [];
    }
  }

  function handleUnlinkTable() {
    selectedTable = null;
  }

  async function handleCheckout() {
    if (cart.length === 0 || isCheckingOut) return;

    isCheckingOut = true;
    checkoutFeedback = '';
    let serverOrderNumber = Math.floor(100 + Math.random() * 900);

    try {
      if (selectedTable) {
        // Fechamento de Conta de Mesa
        const res = await fetch('/api/tables/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: selectedTable.id,
            tableNumber: selectedTable.number,
            paymentMethod,
            items: cart,
            totalCents
          })
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          serverOrderNumber = Number(selectedTable.number) * 100 + Math.floor(Math.random() * 90);
          checkoutFeedback = `✅ Mesa ${selectedTable.number} finalizada e liberada com sucesso!`;
        } else {
          checkoutFeedback = `⚠️ ${resData.error || 'Erro ao fechar mesa.'}`;
          isCheckingOut = false;
          return;
        }
      } else {
        // Venda Balcão Rápido Padrão
        const payload = {
          type: 'BALCAO',
          paymentMethod,
          items: cart.map(i => ({
            productId: i.productId,
            productName: i.name,
            quantity: i.quantity,
            unitPriceCents: i.priceCents,
            notes: i.notes || ''
          }))
        };

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.order) {
            serverOrderNumber = data.order.orderNumber;
          }
        }
      }

      // Preparar Dados Estruturados para Impressão Térmica de Alto Contraste
      printableOrderData = {
        orderNumber: serverOrderNumber,
        type: selectedTable ? 'SALAO' : 'BALCAO',
        tableNumber: selectedTable ? selectedTable.number : undefined,
        customerName: selectedTable ? `Mesa ${selectedTable.number}` : 'Venda Balcão Rápido',
        customerPhone: '',
        status: 'PRONTO',
        paymentMethod,
        paymentStatus: 'PAGO',
        subtotalFormatted: fmt(subtotalCents),
        deliveryFeeFormatted: 'R$ 0,00',
        discountFormatted: 'R$ 0,00',
        totalAmountFormatted: fmt(totalCents),
        totalAmount: (totalCents / 100).toFixed(2),
        createdAt: new Date(),
        items: cart.map(i => ({
          productName: i.name,
          quantity: i.quantity,
          unitPrice: (i.priceCents / 100).toFixed(2),
          totalPrice: ((i.priceCents * i.quantity) / 100).toFixed(2),
          notes: i.notes
        }))
      };

      // Tenta imprimir silenciosamente no Caixa via Cardap Local Print Agent
      const directPrintRes = await PrinterService.printDirect(
        {
          ...lastFinishedOrder,
          items: cart.map(i => ({
            productName: i.name,
            quantity: i.quantity,
            unitPriceFormatted: fmt(i.priceCents),
            totalPriceFormatted: fmt(i.priceCents * i.quantity),
            notes: i.notes
          }))
        },
        'CAIXA',
        { cut: true }
      );

      // Se o agente local não estiver ativo, abre o modal de impressão do navegador como fallback
      if (!directPrintRes.success) {
        receiptModalOpen = true;
      }

      clearCart();
      await loadTables();
    } catch (e: any) {
      console.error('Erro ao finalizar venda no PDV:', e);
      checkoutFeedback = `Falha ao processar venda: ${e.message}`;
    } finally {
      isCheckingOut = false;
    }
  }
</script>

<div class="h-full flex flex-col space-y-4 min-h-0">
  <!-- PanelHeader do Terminal PDV -->
  <div class="bg-white border border-slate-200 shrink-0">
    <PanelHeader
      title="Terminal PDV — Balcão & Mesas"
      subtitle="Vendas rápidas no balcão e fechamento instantâneo de comandas de mesas"
      index="03"
    >
      <div class="flex items-center gap-3">
        <!-- Seletor de Modo: Catálogo vs Mesas do Salão -->
        <div class="flex border border-slate-300 font-mono text-xs">
          <button
            type="button"
            class="px-3 py-1.5 font-bold uppercase transition-colors cursor-pointer {activeTab === 'CATALOGO' ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}"
            on:click={() => activeTab = 'CATALOGO'}
          >
            🛍️ Catálogo Manual
          </button>
          <button
            type="button"
            class="px-3 py-1.5 font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 {activeTab === 'MESAS' ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}"
            on:click={() => { activeTab = 'MESAS'; loadTables(); }}
          >
            <span>🪑 Mesas / Salão</span>
            {#if countOcupadas > 0}
              <span class="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-black">
                {countOcupadas}
              </span>
            {/if}
          </button>
        </div>

        {#if activeTab === 'CATALOGO'}
          <div class="w-64 relative">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Buscar produto ou código..."
              class="w-full p-2 bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 rounded-none focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600"
            />
          </div>
        {:else}
          <button
            type="button"
            class="p-2 border border-slate-300 bg-white hover:bg-slate-50 font-mono text-xs text-slate-700 cursor-pointer"
            on:click={loadTables}
            title="Atualizar Mesas"
          >
            🔄
          </button>
        {/if}
      </div>
    </PanelHeader>
  </div>

  <!-- Feedback Toast -->
  {#if checkoutFeedback}
    <div class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono text-xs font-bold flex items-center justify-between">
      <span>{checkoutFeedback}</span>
      <button on:click={() => checkoutFeedback = ''} class="text-emerald-700 font-black cursor-pointer">✕</button>
    </div>
  {/if}

  <!-- CONTEÚDO PRINCIPAL: ESQUERDA (CATÁLOGO OU MESAS) + DIREITA (CUPOM / FECHAMENTO) -->
  <div class="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
    
    <!-- LADO ESQUERDO: ABA CATÁLOGO OU ABA MESAS -->
    <div class="flex-1 flex flex-col space-y-3 min-h-0">
      
      {#if activeTab === 'CATALOGO'}
        <!-- Categorias SubNav -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 border-b border-slate-200">
          {#each categories as cat}
            <button
              type="button"
              class="px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors border cursor-pointer select-none rounded-none {selectedCategory === cat ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => selectedCategory = cat}
            >
              {cat}
            </button>
          {/each}
        </div>

        <!-- Grid de Produtos -->
        <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {#each filteredProducts as p}
            <div
              role="button"
              tabindex="0"
              class="bg-white border border-slate-200 p-3.5 flex items-start justify-between gap-3.5 hover:bg-slate-50 rounded-none transition-colors cursor-pointer group focus:ring-2 focus:ring-red-600 focus:outline-none"
              on:click={() => addToCart(p)}
              on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart(p); } }}
            >
              <div class="w-16 h-16 bg-slate-100 border border-slate-300 shrink-0 flex items-center justify-center">
                <Icon name="burger" size={28} className="text-slate-600" />
              </div>

              <div class="flex-1 min-w-0 space-y-1">
                <span class="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                  {p.code}
                </span>
                <h4 class="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</h4>
                <span class="font-mono text-sm font-bold text-slate-900 block">{fmt(p.priceCents)}</span>
              </div>

              <span class="px-2 py-1 bg-red-600 group-hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase shrink-0">
                + ADICIONAR
              </span>
            </div>
          {/each}
        </div>

      {:else}
        <!-- ABA: SELEÇÃO E FECHAMENTO DE MESAS -->
        <div class="flex flex-col h-full space-y-3 min-h-0">
          <!-- Filtros de Status das Mesas -->
          <div class="flex items-center gap-1.5 shrink-0 border-b border-slate-200 pb-2 font-mono text-xs">
            <button
              type="button"
              class="px-3 py-1 font-bold uppercase border transition-colors cursor-pointer {filterTableStatus === 'TODAS' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => filterTableStatus = 'TODAS'}
            >
              Todas ({tables.length})
            </button>
            <button
              type="button"
              class="px-3 py-1 font-bold uppercase border transition-colors cursor-pointer {filterTableStatus === 'OCUPADA' ? 'bg-amber-500 text-slate-950 border-amber-500 font-black' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => filterTableStatus = 'OCUPADA'}
            >
              Ocupadas ({countOcupadas})
            </button>
            <button
              type="button"
              class="px-3 py-1 font-bold uppercase border transition-colors cursor-pointer {filterTableStatus === 'CONTA_SOLICITADA' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => filterTableStatus = 'CONTA_SOLICITADA'}
            >
              Conta Pedida ({countConta})
            </button>
            <button
              type="button"
              class="px-3 py-1 font-bold uppercase border transition-colors cursor-pointer {filterTableStatus === 'LIVRE' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => filterTableStatus = 'LIVRE'}
            >
              Livres ({countLivres})
            </button>
          </div>

          <!-- Grid de Mesas para Fechamento -->
          <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-1">
            {#each filteredTables as t}
              <div
                class="border p-3.5 flex flex-col justify-between transition-all duration-150 {selectedTable?.id === t.id
                  ? 'bg-amber-100 border-2 border-slate-900 shadow-md ring-2 ring-red-600'
                  : t.status === 'OCUPADA'
                  ? 'bg-amber-50/90 border-2 border-amber-500'
                  : t.status === 'CONTA_SOLICITADA'
                  ? 'bg-red-50 border-2 border-red-600 animate-pulse'
                  : 'bg-white border-slate-300'}"
              >
                <div>
                  <div class="flex items-center justify-between pb-2 border-b border-slate-200 mb-2 font-mono">
                    <span class="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Icon name="table" size={16} className="text-slate-700" />
                      MESA {t.number < 10 ? `0${t.number}` : t.number}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>

                  <div class="space-y-1 font-mono text-xs text-slate-600">
                    <div class="flex justify-between">
                      <span>Capacidade:</span>
                      <strong class="text-slate-900">{t.capacity} pessoas</strong>
                    </div>

                    {#if t.status !== 'LIVRE'}
                      <div class="flex justify-between">
                        <span>Itens na Comanda:</span>
                        <strong class="text-slate-900">{t.items?.length || 0} lançados</strong>
                      </div>
                      <div class="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span class="text-[10px] text-slate-500 uppercase font-bold">Consumo:</span>
                        <span class="font-extrabold text-sm text-red-600">{t.activeOrderTotalFormatted || 'R$ 0,00'}</span>
                      </div>
                    {:else}
                      <div class="py-3 text-center text-slate-400 font-mono text-xs uppercase">
                        Mesa Livre
                      </div>
                    {/if}
                  </div>
                </div>

                <div class="mt-3 pt-2 border-t border-slate-200">
                  {#if t.status !== 'LIVRE'}
                    <PrimaryButton
                      variant={selectedTable?.id === t.id ? 'accent' : 'primary'}
                      size="sm"
                      fullWidth
                      on:click={() => handleSelectTable(t)}
                    >
                      {selectedTable?.id === t.id ? '✓ Mesa Selecionada' : '⚡ Puxar Consumo p/ PDV'}
                    </PrimaryButton>
                  {:else}
                    <PrimaryButton
                      variant="secondary"
                      size="sm"
                      fullWidth
                      on:click={() => handleSelectTable(t)}
                    >
                      Lançar na Mesa {t.number}
                    </PrimaryButton>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- LADO DIREITO: CUPOM FISCAL / FECHAMENTO DA CONTA -->
    <div class="w-full lg:w-[440px] bg-white border border-slate-200 p-4 flex flex-col justify-between shrink-0 min-h-0">
      <div>
        <!-- Header do Cupom com Identificação da Mesa -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 font-mono">
          <div>
            {#if selectedTable}
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-xs uppercase">
                  MESA {selectedTable.number < 10 ? `0${selectedTable.number}` : selectedTable.number}
                </span>
                <span class="text-xs font-bold uppercase text-slate-700">Fechamento de Conta</span>
              </div>
            {:else}
              <span class="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Icon name="receipt" size={16} className="text-slate-600" />
                Venda Balcão Rápido
              </span>
            {/if}
          </div>

          <div class="flex items-center gap-1.5">
            {#if selectedTable}
              <button
                type="button"
                class="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold uppercase cursor-pointer"
                on:click={handleUnlinkTable}
                title="Desvincular Mesa e voltar para venda Balcão"
              >
                ✕ Desvincular
              </button>
            {/if}
            <PrimaryButton variant="secondary" size="sm" shortcut="ESC" on:click={clearCart}>
              Limpar
            </PrimaryButton>
          </div>
        </div>

        {#if selectedTable}
          <div class="mb-3 p-2 bg-amber-50 border border-amber-300 font-mono text-xs flex items-center justify-between">
            <span class="text-amber-900 font-bold">🪑 Itens importados da Mesa {selectedTable.number}</span>
            <button
              type="button"
              class="text-[10px] text-amber-950 font-extrabold uppercase underline cursor-pointer"
              on:click={() => activeTab = 'CATALOGO'}
            >
              + Adicionar Itens
            </button>
          </div>
        {/if}

        <!-- Lista de Itens no Carrinho / Comanda -->
        <div class="max-h-[250px] overflow-y-auto space-y-2 font-mono text-xs pr-1 divide-y divide-slate-100">
          {#each cart as item}
            <div class="pt-2 first:pt-0 flex items-center justify-between gap-2">
              <div class="flex-1">
                <div class="font-bold text-slate-900">{item.name}</div>
                <div class="text-[10px] text-slate-500">{item.quantity}x {fmt(item.priceCents)}</div>
                {#if item.notes}
                  <div class="text-[10px] text-amber-800 font-bold">Obs: {item.notes}</div>
                {/if}
              </div>

              <div class="flex items-center gap-1">
                <button on:click={() => updateItemQty(item.id, -1)} class="w-6 h-6 bg-slate-100 border border-slate-300 font-bold hover:bg-slate-200 text-slate-800 cursor-pointer">-</button>
                <span class="w-6 text-center font-bold">{item.quantity}</span>
                <button on:click={() => updateItemQty(item.id, 1)} class="w-6 h-6 bg-slate-100 border border-slate-300 font-bold hover:bg-slate-200 text-slate-800 cursor-pointer">+</button>
              </div>

              <div class="font-bold text-right text-slate-900 w-20">
                {fmt(item.priceCents * item.quantity)}
              </div>
            </div>
          {:else}
            <div class="py-10 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-200 space-y-1">
              <div>🛒 Nenhum item no cupom</div>
              <p class="text-[10px] text-slate-400 font-sans">
                Adicione produtos do catálogo ou puxe a comanda de uma mesa na aba "Mesas / Salão".
              </p>
            </div>
          {/each}
        </div>
      </div>

      <!-- Painel Inferior de Pagamento & Totais -->
      <div class="pt-4 border-t border-slate-200 space-y-3">
        <!-- Seletor de Forma de Pagamento -->
        <div>
          <span class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            Forma de Pagamento:
          </span>
          <div class="grid grid-cols-4 gap-1 font-mono text-[10px]">
            <button
              class="py-1.5 font-bold uppercase border rounded-none cursor-pointer {paymentMethod === 'DINHEIRO' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => paymentMethod = 'DINHEIRO'}
            >
              Dinheiro
            </button>
            <button
              class="py-1.5 font-bold uppercase border rounded-none cursor-pointer {paymentMethod === 'PIX' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => paymentMethod = 'PIX'}
            >
              PIX
            </button>
            <button
              class="py-1.5 font-bold uppercase border rounded-none cursor-pointer {paymentMethod === 'CARTAO_CREDITO' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => paymentMethod = 'CARTAO_CREDITO'}
            >
              Crédito
            </button>
            <button
              class="py-1.5 font-bold uppercase border rounded-none cursor-pointer {paymentMethod === 'CARTAO_DEBITO' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
              on:click={() => paymentMethod = 'CARTAO_DEBITO'}
            >
              Débito
            </button>
          </div>
        </div>

        <!-- Calculadora de Troco -->
        {#if paymentMethod === 'DINHEIRO'}
          <div class="grid grid-cols-2 gap-2 bg-amber-50 p-2.5 border border-amber-300 font-mono text-xs">
            <div>
              <label for="cashGivenInput" class="block text-[9px] uppercase font-bold text-amber-950">Valor Recebido (R$):</label>
              <input
                id="cashGivenInput"
                type="text"
                bind:value={cashGivenInput}
                placeholder="0.00"
                class="w-full p-1.5 bg-white border border-amber-400 font-bold rounded-none focus:outline-none focus:border-red-600"
              />
            </div>
            <div>
              <span class="block text-[9px] uppercase font-bold text-amber-950">Troco a Devolver:</span>
              <span class="font-extrabold text-sm text-emerald-800 block pt-1.5">{fmt(changeCents)}</span>
            </div>
          </div>
        {/if}

        <!-- Total Final em Destaque -->
        <div class="bg-slate-900 p-3 text-white flex items-center justify-between border border-slate-800">
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-300">
            {selectedTable ? `Total Mesa ${selectedTable.number}:` : 'Total a Pagar:'}
          </span>
          <span class="font-mono text-2xl font-extrabold text-red-500">{fmt(totalCents)}</span>
        </div>

        <PrimaryButton
          variant="primary"
          size="lg"
          fullWidth
          shortcut="F2"
          disabled={cart.length === 0 || isCheckingOut}
          on:click={handleCheckout}
        >
          <Icon name="printer" size={16} className="mr-1" />
          {#if isCheckingOut}
            Processando...
          {:else if selectedTable}
            Finalizar & Liberar Mesa {selectedTable.number}
          {:else}
            Finalizar Venda & Imprimir
          {/if}
        </PrimaryButton>
      </div>
    </div>
  </div>
</div>

<!-- Modal de Impressão Térmica Padronizada ESC/POS (80mm / 58mm) -->
<ThermalPrintModal
  isOpen={receiptModalOpen}
  onClose={() => receiptModalOpen = false}
  order={printableOrderData}
/>
