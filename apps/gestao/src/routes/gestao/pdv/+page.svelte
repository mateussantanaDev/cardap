<script lang="ts">
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import Icon from '$components/Icon.svelte';
  import { PrinterService, type PrintableOrder } from '$services/printerService';

  import { onMount } from 'svelte';

  export let data: any = {};

  let categories = ['TODOS', 'PASTEIS', 'MONTE', 'BEBIDAS', 'DOCES'];
  let selectedCategory = 'TODOS';
  let searchQuery = '';
  let paymentMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' = 'DINHEIRO';
  let cashGivenInput = '';
  let receiptModalOpen = false;
  let receiptText = '';

  $: if (data?.categories && data.categories.length > 0) {
    categories = data.categories;
  }
  $: if (data?.products && data.products.length > 0) {
    products = data.products;
  }

  interface CartItem {
    id: string;
    productId: string;
    name: string;
    priceCents: number;
    quantity: number;
    notes?: string;
  }

  let cart: CartItem[] = [];

  let products: any[] = [
    { id: 'p1', code: 'PAST-02', category: 'TRADICIONAIS', name: 'Pastel de Carne com Queijo Coalho', priceCents: 1850 },
    { id: 'p2', code: 'PAST-03', category: 'TRADICIONAIS', name: 'Pastel de Frango Catupiry Original', priceCents: 1800 },
    { id: 'p3', code: 'PAST-01', category: 'MONTE', name: 'Monte seu Pastel Imperius (25cm)', priceCents: 2300 },
    { id: 'p4', code: 'BEB-01', category: 'BEBIDAS', name: 'Caldo de Cana Gelado 500ml', priceCents: 800 },
    { id: 'p5', code: 'BEB-04', category: 'BEBIDAS', name: 'Coca-Cola Original 350ml', priceCents: 650 },
    { id: 'p6', code: 'PAST-07', category: 'DOCES', name: 'Pastel Romeu & Julieta Especial', priceCents: 1500 }
  ];

  async function loadCatalog() {
    try {
      const res = await fetch('/api/catalog?channel=B2B');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.categories) {
          const list: any[] = [];
          for (const cat of data.categories) {
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

  onMount(() => {
    loadCatalog();
  });

  $: filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'TODOS' || p.category.includes(selectedCategory);
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  $: subtotalCents = cart.reduce((acc, item) => acc + (item.priceCents * item.quantity), 0);
  $: totalCents = subtotalCents;

  $: cashGivenVal = parseFloat(cashGivenInput.replace(',', '.')) || 0;
  $: changeCents = Math.max(0, Math.round(cashGivenVal * 100) - totalCents);

  const fmt = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  function addToCart(product: typeof products[0]) {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      cart = cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      cart = [...cart, { id: `c-${Date.now()}`, productId: product.id, name: product.name, priceCents: product.priceCents, quantity: 1 }];
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
  }

  async function handleCheckout() {
    if (cart.length === 0) return;

    let serverOrderNumber = Math.floor(100 + Math.random() * 900);
    try {
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
    } catch (e) {
      console.error('Erro ao enviar pedido para o backend:', e);
    }

    const printableOrder: PrintableOrder = {
      orderNumber: serverOrderNumber,
      type: 'BALCAO',
      status: 'PRONTO',
      paymentMethod,
      paymentStatus: 'PAGO',
      subtotalFormatted: fmt(subtotalCents),
      deliveryFeeFormatted: 'R$ 0,00',
      discountFormatted: 'R$ 0,00',
      totalAmountFormatted: fmt(totalCents),
      createdAt: new Date(),
      items: cart.map(i => ({
        productName: i.name,
        quantity: i.quantity,
        unitPriceFormatted: fmt(i.priceCents),
        totalPriceFormatted: fmt(i.priceCents * i.quantity),
        notes: i.notes
      }))
    };

    receiptText = PrinterService.generateReceiptText(printableOrder);
    receiptModalOpen = true;
    clearCart();
  }
</script>

<div class="h-full flex flex-col space-y-4 min-h-0">
  <!-- PanelHeader do Terminal PDV Spec 2.0.0 -->
  <div class="bg-white border border-slate-200 shrink-0">
    <PanelHeader
      title="Terminal PDV — Balcão Rápido"
      subtitle="Vendas diretas para consumo presencial ou retirada imediata"
      index="03"
    >
      <div class="w-72 relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Buscar produto ou código (ex: PROD-01)..."
          class="w-full p-2 bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 rounded-none focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600"
        />
      </div>
    </PanelHeader>
  </div>

  <!-- CONTEÚDO PRINCIPAL: PRODUTOS (ESQUERDA) + CUPOM (DIREITA) -->
  <div class="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
    
    <!-- LADO ESQUERDO: FILTROS + CATÁLOGO DE PRODUTOS -->
    <div class="flex-1 flex flex-col space-y-3 min-h-0">
      
      <!-- Categorias SubNav Spec 2.0.0 (red-600 active) -->
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

      <!-- Grid de Produtos Spec 3.5 com Thumbnail Vetorial à esquerda -->
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
    </div>

    <!-- LADO DIREITO: CUPOM FISCAL / CARRINHO ATUAL -->
    <div class="w-full lg:w-[420px] bg-white border border-slate-200 p-4 flex flex-col justify-between shrink-0 min-h-0">
      <div>
        <!-- Header do Cupom -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Icon name="receipt" size={16} className="text-slate-600" />
            Cupom Atual
          </span>
          <PrimaryButton variant="secondary" size="sm" shortcut="ESC" on:click={clearCart}>
            Limpar
          </PrimaryButton>
        </div>

        <!-- Lista de Itens no Carrinho -->
        <div class="max-h-[260px] overflow-y-auto space-y-2 font-mono text-xs pr-1 divide-y divide-slate-100">
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
            <div class="py-12 text-center text-slate-400 font-mono text-xs uppercase border border-dashed border-slate-200">
              Nenhum item selecionado
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

        <!-- Total Final em Destaque 10% red-600 -->
        <div class="bg-slate-900 p-3 text-white flex items-center justify-between border border-slate-800">
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-300">Total a Pagar:</span>
          <span class="font-mono text-2xl font-extrabold text-red-500">{fmt(totalCents)}</span>
        </div>

        <PrimaryButton
          variant="primary"
          size="lg"
          fullWidth
          shortcut="F2"
          disabled={cart.length === 0}
          on:click={handleCheckout}
        >
          <Icon name="printer" size={16} className="mr-1" />
          Finalizar Venda & Imprimir
        </PrimaryButton>
      </div>
    </div>
  </div>
</div>

<!-- Modal de Impressão Térmica ESC/POS Mock -->
{#if receiptModalOpen}
  <div class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
    <div class="bg-white border-2 border-slate-900 max-w-md w-full p-6 rounded-none space-y-4 shadow-none">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Icon name="printer" size={16} className="text-slate-600" />
          Buffer Impressão ESC/POS (48 Colunas)
        </span>
        <button on:click={() => receiptModalOpen = false} class="font-mono font-bold text-slate-500 hover:text-slate-900 cursor-pointer">✕</button>
      </div>

      <pre class="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] leading-tight overflow-x-auto border border-slate-800 rounded-none max-h-[380px]">{receiptText}</pre>

      <div class="flex justify-end gap-2">
        <PrimaryButton variant="secondary" on:click={() => receiptModalOpen = false}>
          Fechar
        </PrimaryButton>
        <PrimaryButton variant="primary" on:click={() => receiptModalOpen = false}>
          Enviar para Impressora Térmica
        </PrimaryButton>
      </div>
    </div>
  </div>
{/if}
