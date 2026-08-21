<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$stores/authStore';
  import { tenantManager } from '$stores/tenantStore';
  import Icon from '$components/Icon.svelte';

  export let data: any;

  const { tenants, activeTenant } = tenantManager;

  let currentTime = '';
  let wsOnline = true;

  // Sincronizar usuário e estabelecimentos vindos do servidor via SSR
  $: if (data?.user) {
    authStore.setUser(data.user);
  }
  $: if (data?.restaurants && data.restaurants.length > 0) {
    tenantManager.setTenants(data.restaurants);
  }

  function updateClock() {
    const now = new Date();
    currentTime = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    authStore.clear();
    goto('/login');
  }

  function handleGlobalKeyDown(event: KeyboardEvent) {
    // Se o usuário for Cozinheiro, bloquear atalhos para outras áreas
    if ($authStore?.role === 'COZINHA') {
      if (['F1', 'F2', 'F3', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(event.key)) {
        event.preventDefault();
        return;
      }
    }

    if (event.key === 'F1') {
      event.preventDefault();
      goto('/gestao');
    } else if (event.key === 'F2') {
      event.preventDefault();
      goto('/gestao/pdv');
    } else if (event.key === 'F3') {
      event.preventDefault();
      goto('/gestao/salao');
    } else if (event.key === 'F4') {
      event.preventDefault();
      goto('/gestao/cozinha');
    } else if (event.key === 'F5') {
      event.preventDefault();
      goto('/gestao/cardapio');
    } else if (event.key === 'F6') {
      event.preventDefault();
      goto('/gestao/estoque');
    } else if (event.key === 'F7') {
      event.preventDefault();
      goto('/gestao/relatorios');
    } else if (event.key === 'F8') {
      event.preventDefault();
      goto('/gestao/clientes');
    } else if (event.key === 'F9') {
      event.preventDefault();
      goto('/gestao/caixa');
    } else if (event.key === 'F10') {
      event.preventDefault();
      goto('/gestao/configuracoes');
    }
  }

  onMount(() => {
    updateClock();
    const interval = setInterval(updateClock, 1000);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  $: currentPath = $page.url.pathname;
  $: isLoginPage = currentPath === '/login';
  $: isGestaoHome = String(currentPath) === '/' || String(currentPath) === '/gestao';

  // Redirecionamento RBAC para Cozinheiro
  $: if ($authStore?.role === 'COZINHA' && !isLoginPage && currentPath !== '/gestao/cozinha') {
    goto('/gestao/cozinha');
  }

  function handleTenantChange(e: Event) {
    const val = (e.currentTarget as HTMLSelectElement).value;
    if (val === '__SAAS_PANEL__') {
      goto('/gestao/saas');
    } else {
      tenantManager.selectTenant(val);
    }
  }

  const routeTitles: Record<string, string> = {
    '/gestao': 'Visão Geral & Dashboard',
    '/gestao/pdv': 'Terminal PDV — Balcão & Mesas',
    '/gestao/salao': 'Mapa de Mesas & Comandas',
    '/gestao/cozinha': 'KDS de Cozinha em Tempo Real',
    '/gestao/cardapio': 'Gestão de Cardápio & Categorias',
    '/gestao/pedidos': 'Gestão de Pedidos & Delivery',
    '/gestao/estoque': 'Controle de Estoque & Insumos',
    '/gestao/crm': 'Base de Clientes & WhatsApp CRM',
    '/gestao/caixa': 'Frente de Caixa & Turnos',
    '/gestao/financeiro': 'Relatórios Financeiros & DRE',
    '/gestao/configuracoes': 'Configurações & Impressão',
    '/gestao/superadmin': 'SuperAdmin — Gestão de Restaurantes',
    '/gestao/saas': 'Painel SaaS Global',
    '/login': 'Entrar no Sistema'
  };

  $: pageTitle = routeTitles[currentPath]
    ? `${routeTitles[currentPath]} — Cardap ERP`
    : 'Cardap ERP — Sistema Integrado de Gestão';
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

{#if isLoginPage}
  <slot />
{:else}
  <!-- 1. SHELL CONTAINER COM SIDEBAR FIXA (h-screen overflow-hidden) -->
  <div class="h-screen flex overflow-hidden bg-slate-50 text-slate-900 font-sans">
    <!-- SIDEBAR LATERAL FIXA MULTI-TENANT (w-64 h-screen overflow-y-auto) -->
    <aside class="w-64 h-screen bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shrink-0 select-none overflow-y-auto">
      <div>
        <!-- Brand Header (Regra 70/20/10: 10% Acento Focal red-600) -->
        <div class="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-3">
          <div class="w-8 h-8 bg-red-600 text-white font-mono font-extrabold text-sm flex items-center justify-center border border-red-700 shrink-0">
            C
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-mono text-sm font-bold tracking-wider text-white truncate">CARDAP ERP</span>
            <span class="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-semibold truncate">
              SAAS MULTI-TENANT
            </span>
          </div>
        </div>

        <!-- Seletor Multi-Tenant de Estabelecimentos (Restaurantes) -->
        <div class="p-3 bg-slate-950/60 border-b border-slate-800 space-y-1">
          <label for="tenantSelectNav" class="block font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            ESTABELECIMENTO:
          </label>
          {#if data?.isSuperAdmin}
            <select
              id="tenantSelectNav"
              value={$activeTenant?.id || ''}
              on:change={handleTenantChange}
              class="w-full p-1.5 bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 rounded-none focus:outline-none focus:border-red-600 cursor-pointer"
            >
              {#if $tenants.length === 0}
                <option value="">Nenhum Restaurante Criado</option>
              {:else}
                {#each $tenants as t}
                  <option value={t.id}>{t.name} ({t.category})</option>
                {/each}
              {/if}
              <option value="__SAAS_PANEL__">⚡ Painel SuperAdmin SaaS...</option>
            </select>
          {:else}
            <div class="w-full p-2 bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 truncate">
              🏢 {$activeTenant?.name || 'Meu Restaurante'}
            </div>
          {/if}
        </div>

        <!-- Navigation Menu B2G com Ícones Vetoriais e Filtro RBAC -->
        <nav class="p-2 space-y-1 font-mono text-xs font-bold uppercase tracking-wider">
          {#if $authStore?.role === 'COZINHA'}
            <!-- Menu Limitado para Cozinheiro -->
            <a
              href="/gestao/cozinha"
              class="flex items-center justify-between px-3 py-2 bg-red-600 text-white border-l-2 border-white rounded-none"
            >
              <span class="flex items-center gap-2">
                <Icon name="kitchen" size={16} className="text-white" />
                Cozinha KDS
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-white border border-slate-800">F4</kbd>
            </a>
            <div class="p-3 mt-4 bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-sans leading-normal">
              🔒 <strong>Acesso Limitado (Cozinha):</strong> Você possui permissão exclusiva para gerenciar o quadro Kanban KDS.
            </div>
          {:else}
            <!-- Menu Completo para Admin / Caixa -->
            <a
              href="/gestao"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {isGestaoHome ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="chart" size={16} className={isGestaoHome ? 'text-red-500' : 'text-slate-400'} />
                Visão Geral / BI
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F1</kbd>
            </a>

            <a
              href="/gestao/pdv"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/pdv' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="receipt" size={16} className={currentPath === '/gestao/pdv' ? 'text-red-500' : 'text-slate-400'} />
                PDV & Balcão
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F2</kbd>
            </a>

            <a
              href="/gestao/salao"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/salao' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="table" size={16} className={currentPath === '/gestao/salao' ? 'text-red-500' : 'text-slate-400'} />
                Salão & Mesas
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F3</kbd>
            </a>

            <a
              href="/gestao/cozinha"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/cozinha' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="kitchen" size={16} className={currentPath === '/gestao/cozinha' ? 'text-red-500' : 'text-slate-400'} />
                Cozinha KDS
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F4</kbd>
            </a>

            <a
              href="/gestao/cardapio"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/cardapio' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="store" size={16} className={currentPath === '/gestao/cardapio' ? 'text-red-500' : 'text-slate-400'} />
                Gestão do Cardápio
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F5</kbd>
            </a>

            <a
              href="/gestao/estoque"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/estoque' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="clipboard" size={16} className={currentPath === '/gestao/estoque' ? 'text-red-500' : 'text-slate-400'} />
                Estoque & Insumos
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F6</kbd>
            </a>

            <a
              href="/gestao/relatorios"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/relatorios' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="chart" size={16} className={currentPath === '/gestao/relatorios' ? 'text-red-500' : 'text-slate-400'} />
                Relatórios & Vendas
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F7</kbd>
            </a>

            <a
              href="/gestao/clientes"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/clientes' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="user" size={16} className={currentPath === '/gestao/clientes' ? 'text-red-500' : 'text-slate-400'} />
                CRM & Clientes
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F8</kbd>
            </a>

            <a
              href="/gestao/caixa"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/caixa' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="cash-register" size={16} className={currentPath === '/gestao/caixa' ? 'text-red-500' : 'text-slate-400'} />
                Turno de Caixa
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F9</kbd>
            </a>

            <a
              href="/gestao/configuracoes"
              class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none {currentPath === '/gestao/configuracoes' ? 'bg-slate-800 text-white border-l-2 border-red-600' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent'}"
            >
              <span class="flex items-center gap-2">
                <Icon name="printer" size={16} className={currentPath === '/gestao/configuracoes' ? 'text-red-500' : 'text-slate-400'} />
                Configurações
              </span>
              <kbd class="px-1 py-0.5 text-[9px] bg-slate-950 text-slate-400 border border-slate-800">F10</kbd>
            </a>

            <!-- Link direto para SuperAdmin SaaS (Apenas para SuperAdmin) -->
            {#if data?.isSuperAdmin}
              <a
                href="/gestao/saas"
                class="flex items-center justify-between px-3 py-1.5 transition-colors rounded-none mt-3 bg-red-950/60 text-red-300 hover:bg-red-900/80 hover:text-white border border-red-800"
              >
                <span class="flex items-center gap-2">
                  <Icon name="store" size={16} className="text-red-400" />
                  SuperAdmin SaaS
                </span>
                <span class="text-[9px] px-1 bg-red-600 text-white font-bold">SAAS</span>
              </a>
            {/if}
          {/if}
        </nav>
      </div>

      <!-- User Profile Footer com Botão de Logout -->
      <div class="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 bg-slate-800 text-slate-200 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
            {$authStore?.avatar || 'AD'}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold text-slate-200 truncate">{$authStore?.name || 'Administrador'}</span>
            <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider truncate">
              {$authStore?.roleLabel || 'ADMIN / GERENTE'}
            </span>
          </div>
        </div>

        <button
          type="button"
          class="px-2 py-1 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white font-mono text-[9px] font-bold uppercase transition-colors cursor-pointer border border-slate-700"
          on:click={handleLogout}
          title="Sair da Sessão"
        >
          Sair
        </button>
      </div>
    </aside>

    <!-- 2. CONTEÚDO PRINCIPAL COM HEADER SUPERIOR (flex-1 flex flex-col h-screen overflow-hidden) -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      <!-- Header Superior ERP -->
      <header class="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2 font-mono text-xs text-slate-500">
          <span class="text-slate-900 font-bold">CARDAP ERP</span>
          <span>/</span>
          <span class="text-red-600 font-bold uppercase">
            {$activeTenant?.name || 'Nenhum Restaurante'}
          </span>
          <span>/</span>
          <span class="text-slate-700 font-semibold uppercase">
            {isGestaoHome ? 'VISÃO GERAL' : currentPath.split('/').pop()?.toUpperCase()}
          </span>
        </div>

        <div class="flex items-center gap-4">
          <!-- Badge RBAC -->
          <div class="font-mono text-[10px] font-bold px-2 py-0.5 border border-slate-300 bg-slate-100 text-slate-800 uppercase">
            ROLE: {$authStore?.role || 'ADMIN'}
          </div>

          <!-- Status WebSocket -->
          <div class="flex items-center gap-2 font-mono text-xs text-slate-600 bg-slate-50 px-2.5 py-0.5 border border-slate-200">
            <span class="w-2 h-2 rounded-none {wsOnline ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'}"></span>
            <span class="font-bold text-[10px] uppercase tracking-wider">
              {wsOnline ? 'WebSocket: Online' : 'WebSocket: Offline'}
            </span>
          </div>

          <!-- Relógio Operacional -->
          <div class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 border border-slate-300">
            {currentTime || '12:00:00'}
          </div>
        </div>
      </header>

      <!-- Área Principal de Conteúdo COM SCROLL EXCLUSIVO NO MAIN -->
      <main class="flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto p-6 bg-slate-50 flex flex-col justify-between">
        <div class="flex-1">
          <slot />
        </div>

        <!-- Rodapé Institucional -->
        <footer class="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between font-mono text-[10px] text-slate-500 shrink-0">
          <div>
            CARDAP PLATAFORMA SAAS v2.0.0 · BUILD 2026.08
          </div>
          <div>
            ESTABELECIMENTO: <strong class="text-slate-900 font-bold font-mono">{($activeTenant?.name || 'NENHUM').toUpperCase()}</strong> ({$activeTenant?.slug || 'sem-slug'}) · STATUS: OPERACIONAL
          </div>
        </footer>
      </main>
    </div>
  </div>
{/if}
