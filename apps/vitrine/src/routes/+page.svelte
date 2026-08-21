<script lang="ts">
  import '../app.css';
  import TableSessionBanner from '$components/TableSessionBanner.svelte';
  import TableComandaModal from '$components/TableComandaModal.svelte';

  export let data: any;
  $: allRestaurants = data?.restaurants || [];

  let isComandaModalOpen = false;

  // Estado de Localização / Endereço
  let userAddress = '';
  let isLocating = false;
  let locationToast = '';

  // Filtros de Culinária & Busca
  let searchQuery = '';
  let selectedCategory = 'TODOS';
  let filterOnlyOpen = false;
  let filterFreeDelivery = false;
  let filterFastDelivery = false;

  const cuisineCategories = [
    { id: 'TODOS', label: 'Tudo', icon: '🍽️' },
    { id: 'LANCHES', label: 'Lanches & Burgers', icon: '🍔' },
    { id: 'PASTEIS', label: 'Pastéis & Salgados', icon: '🥟' },
    { id: 'PIZZAS', label: 'Pizzas', icon: '🍕' },
    { id: 'MARMITAS', label: 'Pratos & Marmitas', icon: '🍱' },
    { id: 'JAPONESA', label: 'Japonesa', icon: '🍣' },
    { id: 'DOCES', label: 'Doces & Sobremesas', icon: '🍦' },
    { id: 'BEBIDAS', label: 'Bebidas & Sucos', icon: '🥤' }
  ];

  function handleUseCurrentLocation() {
    isLocating = true;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          userAddress = 'Sua localização atual (Detectada)';
          isLocating = false;
          locationToast = '📍 Localização detectada com sucesso!';
          setTimeout(() => locationToast = '', 3500);
        },
        () => {
          userAddress = 'Centro — Sua Região';
          isLocating = false;
          locationToast = '📍 Endereço padrão definido para a sua região.';
          setTimeout(() => locationToast = '', 3500);
        }
      );
    } else {
      userAddress = 'Centro — Sua Região';
      isLocating = false;
    }
  }

  function clearFilters() {
    searchQuery = '';
    selectedCategory = 'TODOS';
    filterOnlyOpen = false;
    filterFreeDelivery = false;
    filterFastDelivery = false;
    userAddress = '';
  }

  // Filtragem Reativa de Restaurantes
  $: filteredRestaurants = allRestaurants.filter((r: any) => {
    // 1. Filtro por busca de texto (nome, categoria ou endereço)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.name.toLowerCase().includes(q);
      const matchCategory = r.category.toLowerCase().includes(q);
      const matchCity = (r.city || '').toLowerCase().includes(q);
      const matchNeighborhood = (r.neighborhood || '').toLowerCase().includes(q);
      if (!matchName && !matchCategory && !matchCity && !matchNeighborhood) return false;
    }

    // 2. Filtro por Categoria de Culinária
    if (selectedCategory !== 'TODOS') {
      const catMap: Record<string, string[]> = {
        'LANCHES': ['lanche', 'burger', 'hamburguer', 'sandu'],
        'PASTEIS': ['pastel', 'salgado', 'coxinha', 'folhado'],
        'PIZZAS': ['pizza', 'forneria', 'esfiha'],
        'MARMITAS': ['marmita', 'prato', 'refeicao', 'almoco', 'comida'],
        'JAPONESA': ['japa', 'sushi', 'oriental'],
        'DOCES': ['doce', 'sobremesa', 'acai', 'sorvete', 'bolo'],
        'BEBIDAS': ['bebida', 'caldo', 'suco', 'refrigerante', 'cerveja']
      };
      const terms = catMap[selectedCategory] || [selectedCategory.toLowerCase()];
      const catText = (r.category + ' ' + r.name).toLowerCase();
      const match = terms.some(t => catText.includes(t));
      if (!match) return false;
    }

    // 3. Filtros Rápidos (Chips)
    if (filterOnlyOpen && !r.isOpen) return false;
    if (filterFreeDelivery && r.deliveryFee > 0) return false;
    if (filterFastDelivery && (r.slaMax > 35)) return false;

    // 4. Filtro por Endereço Digitado (se preenchido)
    if (userAddress.trim() && !userAddress.includes('Detectada')) {
      const addr = userAddress.toLowerCase().trim();
      const matchLoc = (r.city || '').toLowerCase().includes(addr) ||
                       (r.neighborhood || '').toLowerCase().includes(addr) ||
                       (r.street || '').toLowerCase().includes(addr);
      // Se não houver correspondência exata de bairro/cidade, mantém disponível se for entrega ampla
    }

    return true;
  });
</script>

<svelte:head>
  <title>Cardap — Os Melhores Restaurantes e Delivery Perto de Você</title>
  <meta name="description" content="Encontre os melhores restaurantes, lanches, pizzas e sobremesas da sua região com entrega rápida." />
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
  <!-- Banner de Autoatendimento em Mesa via QR Code -->
  <TableSessionBanner onOpenComanda={() => isComandaModalOpen = true} />

  <!-- Top Navigation Bar -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
    <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <!-- Brand Logo -->
      <a href="/" class="flex items-center gap-2 group shrink-0">
        <div class="w-9 h-9 bg-red-600 border border-red-700 text-white font-mono font-black text-xl flex items-center justify-center shadow-xs group-hover:bg-red-700 transition-colors">
          C
        </div>
        <div class="flex flex-col">
          <span class="font-mono text-base font-black tracking-wider text-slate-900 uppercase">
            CARDAP
          </span>
          <span class="text-[9px] font-bold text-red-600 tracking-widest uppercase -mt-1">
            DELIVERY
          </span>
        </div>
      </a>

      <!-- Seletor de Endereço Rápido no Header (Mobile & Desktop) -->
      <button
        type="button"
        on:click={handleUseCurrentLocation}
        class="flex items-center gap-2 text-left px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full text-xs transition-colors cursor-pointer max-w-[220px] sm:max-w-xs truncate"
        title="Clique para alterar ou detectar sua localização"
      >
        <span class="text-red-600 text-sm">📍</span>
        <span class="text-[11px] font-medium text-slate-800 truncate">
          {userAddress || 'Definir endereço de entrega'}
        </span>
        <span class="text-[10px] text-slate-400">▾</span>
      </button>

      <!-- Link para Restaurantes Parceiros / Gestão -->
      <a
        href="https://app.usecardap.com.br/login"
        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-red-600 transition-colors font-mono uppercase"
      >
        <span>Para Restaurantes</span>
        <span>↗</span>
      </a>
    </div>
  </header>

  <!-- Hero Section & Busca de Endereço Estilo iFood -->
  <section class="bg-gradient-to-b from-white to-slate-100/70 border-b border-slate-200 px-4 pt-6 pb-8">
    <div class="max-w-4xl mx-auto space-y-4">
      <div class="space-y-1 text-center sm:text-left">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Os melhores restaurantes perto de você
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 font-medium">
          Peça pelo Cardap e receba seu pedido quentinho com máxima rapidez.
        </p>
      </div>

      <!-- Barra de Busca de Endereço & Pratos -->
      <div class="bg-white p-2 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0_rgba(15,23,42,0.15)] flex flex-col sm:flex-row items-stretch gap-2">
        <!-- Input Endereço -->
        <div class="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
          <span class="text-slate-400 text-sm">📍</span>
          <input
            type="text"
            bind:value={userAddress}
            placeholder="Digite seu bairro, rua ou cidade..."
            class="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {#if userAddress}
            <button
              type="button"
              on:click={() => userAddress = ''}
              class="text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ✕
            </button>
          {/if}
        </div>

        <!-- Input Busca de Restaurante / Prato -->
        <div class="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
          <span class="text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Buscar prato, pastel, pizza, hambúrguer..."
            class="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {#if searchQuery}
            <button
              type="button"
              on:click={() => searchQuery = ''}
              class="text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ✕
            </button>
          {/if}
        </div>

        <!-- Botão Usar Localização GPS -->
        <button
          type="button"
          on:click={handleUseCurrentLocation}
          disabled={isLocating}
          class="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
        >
          <span>{isLocating ? 'Buscando...' : '📍 Localizar'}</span>
        </button>
      </div>

      {#if locationToast}
        <div class="p-2.5 bg-emerald-50 border border-emerald-500 text-emerald-900 text-xs font-bold rounded-lg flex items-center gap-2">
          <span>{locationToast}</span>
        </div>
      {/if}
    </div>
  </section>

  <!-- Carrossel de Categorias Rápidas de Comida (Estilo iFood) -->
  <section class="max-w-4xl mx-auto w-full px-4 py-4">
    <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
      {#each cuisineCategories as cat}
        <button
          type="button"
          on:click={() => selectedCategory = cat.id}
          class="flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer {selectedCategory === cat.id ? 'bg-red-600 text-white border-red-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'}"
        >
          <span class="text-sm">{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      {/each}
    </div>
  </section>

  <!-- Filtros Rápidos (Chips estilo iFood) -->
  <section class="max-w-4xl mx-auto w-full px-4 pb-2">
    <div class="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
      <button
        type="button"
        on:click={() => filterOnlyOpen = !filterOnlyOpen}
        class="px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer {filterOnlyOpen ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}"
      >
        🟢 Abertos Agora
      </button>

      <button
        type="button"
        on:click={() => filterFreeDelivery = !filterFreeDelivery}
        class="px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer {filterFreeDelivery ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}"
      >
        🛵 Entrega Grátis
      </button>

      <button
        type="button"
        on:click={() => filterFastDelivery = !filterFastDelivery}
        class="px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer {filterFastDelivery ? 'bg-amber-500 text-slate-950 border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}"
      >
        ⏱️ Mais Rápidos (&lt; 35 min)
      </button>

      {#if searchQuery || selectedCategory !== 'TODOS' || filterOnlyOpen || filterFreeDelivery || filterFastDelivery || userAddress}
        <button
          type="button"
          on:click={clearFilters}
          class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 text-xs font-bold transition-all cursor-pointer"
        >
          Limpar Filtros ✕
        </button>
      {/if}
    </div>
  </section>

  <!-- Lista Principal de Restaurantes Parceiros -->
  <main class="max-w-4xl mx-auto w-full px-4 py-4 flex-1">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
        Restaurantes Disponíveis
      </h2>
      <span class="text-xs font-mono font-bold text-slate-500">
        {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'opção' : 'opções'}
      </span>
    </div>

    {#if filteredRestaurants.length === 0}
      <!-- Empty State Elegante de Consumidor -->
      <div class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-4 my-4">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-3xl">
          🔍
        </div>
        <div class="space-y-1">
          <h3 class="font-bold text-slate-900 text-base">Nenhum restaurante encontrado</h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            Não encontramos estabelecimentos para os filtros selecionados. Tente buscar por outro bairro, prato ou limpe os filtros para ver todas as opções.
          </p>
        </div>
        <div>
          <button
            type="button"
            on:click={clearFilters}
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Ver Todos os Restaurantes
          </button>
        </div>
      </div>
    {:else}
      <!-- Grid de Restaurantes Estilo iFood -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredRestaurants as r (r.id || r.slug)}
          <a
            href={`/${r.slug}`}
            class="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-red-500 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <!-- Banner / Header do Card -->
            <div class="h-28 bg-slate-900 relative overflow-hidden flex items-center justify-center">
              {#if r.bannerUrl}
                <img
                  src={r.bannerUrl}
                  alt={r.name}
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              {:else}
                <div class="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 flex items-center justify-center">
                  <span class="font-mono text-3xl font-black text-white/20 uppercase tracking-widest">
                    {r.name.slice(0, 3)}
                  </span>
                </div>
              {/if}

              <!-- Logo Flutuante -->
              <div class="absolute bottom-2 left-3 w-12 h-12 bg-white border-2 border-white rounded-xl shadow-md overflow-hidden flex items-center justify-center">
                {#if r.logoUrl}
                  <img src={r.logoUrl} alt={r.name} class="w-full h-full object-cover" />
                {:else}
                  <span class="font-mono font-black text-red-600 text-lg">
                    {r.name.slice(0, 1)}
                  </span>
                {/if}
              </div>

              <!-- Status Badge (Aberto / Fechado) -->
              <div class="absolute top-2 right-2">
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full {r.isOpen ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'}">
                  {r.isOpen ? 'ABERTO' : 'FECHADO'}
                </span>
              </div>
            </div>

            <!-- Informações do Restaurante -->
            <div class="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
              <div class="space-y-1">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-bold text-slate-900 text-sm group-hover:text-red-600 transition-colors line-clamp-1">
                    {r.name}
                  </h3>
                  <span class="text-xs font-bold text-amber-600 shrink-0">
                    ★ 4.9
                  </span>
                </div>

                <p class="text-xs text-slate-500 line-clamp-1">
                  {r.category}
                </p>
              </div>

              <!-- Detalhes de Entrega & Taxa -->
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-600">
                <div class="flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>{r.slaText}</span>
                </div>

                <div class="flex items-center gap-1.5 font-bold {r.deliveryFee === 0 ? 'text-emerald-700' : 'text-slate-800'}">
                  <span>🛵</span>
                  <span>{r.deliveryFeeText}</span>
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </main>

  <!-- Footer de Consumidor (Marketplace) -->
  <footer class="bg-white border-t border-slate-200 mt-12 py-8 px-4 text-slate-600 text-xs">
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100 text-center sm:text-left">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-red-600 text-white font-mono font-black text-base flex items-center justify-center">
            C
          </div>
          <span class="font-mono text-sm font-black text-slate-900 tracking-wider">
            CARDAP DELIVERY
          </span>
        </div>

        <div class="flex items-center gap-6 text-xs font-medium">
          <a href="/" class="hover:text-red-600 transition-colors">Início</a>
          <a href="https://app.usecardap.com.br/login" class="hover:text-red-600 transition-colors font-bold text-red-600">
            Cadastre seu Restaurante ↗
          </a>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 text-center sm:text-left">
        <span>© 2026 Cardap — Conectando você aos melhores sabores da sua cidade.</span>
        <span>Todos os direitos reservados.</span>
      </div>
    </div>
  </footer>

  <!-- Modal de Visualização da Comanda da Mesa -->
  <TableComandaModal
    isOpen={isComandaModalOpen}
    onClose={() => isComandaModalOpen = false}
  />
</div>
