<script lang="ts">
  import { tenantManager, type Tenant, type TenantPlan } from '$stores/tenantStore';
  import { goto } from '$app/navigation';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import Modal from '$ui/Modal.svelte';
  import Icon from '$components/Icon.svelte';

  import { onMount } from 'svelte';

  const { tenants, activeTenant, selectTenant, toggleStatus, updatePlan, addTenant } = tenantManager;

  let isNewTenantModalOpen = false;
  let toastMessage = '';

  async function loadRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.restaurants && data.restaurants.length > 0) {
          tenants.set(data.restaurants);
          if (data.restaurants[0]) {
            tenantManager.selectTenant(data.restaurants[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao buscar restaurantes:', e);
    }
  }

  onMount(() => {
    loadRestaurants();
  });

  let newTenant: Tenant = {
    id: '',
    slug: '',
    name: '',
    category: 'Pastelaria Artesanal',
    cnpj: '',
    ownerName: '',
    ownerPhone: '',
    plan: 'ENTERPRISE',
    planPriceCents: 29900,
    status: 'ATIVO',
    vitrineUrl: '',
    createdAt: new Date().toLocaleDateString('pt-BR'),
    totalOrdersMonth: 0,
    gmvMonthCents: 0
  };

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  $: activeCount = $tenants.filter(t => t.status === 'ATIVO').length;
  $: totalMrrCents = $tenants.filter(t => t.status !== 'SUSPENSO').reduce((acc, t) => acc + t.planPriceCents, 0);
  $: totalGmvCents = $tenants.reduce((acc, t) => acc + t.gmvMonthCents, 0);
  $: totalOrders = $tenants.reduce((acc, t) => acc + t.totalOrdersMonth, 0);

  function handleSelectTenantAndGo(t: Tenant) {
    tenantManager.selectTenant(t.id);
    toastMessage = `Contexto ERP alterado com sucesso para "${t.name}"!`;
    setTimeout(() => toastMessage = '', 3500);
    goto('/gestao');
  }

  function handleOpenNewModal() {
    newTenant = {
      id: `t-${Date.now()}`,
      slug: '',
      name: '',
      category: 'Hamburgueria Artesanal',
      cnpj: '',
      ownerName: '',
      ownerPhone: '',
      plan: 'PRO_DELIVERY',
      planPriceCents: 19900,
      status: 'ATIVO',
      vitrineUrl: '',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      totalOrdersMonth: 0,
      gmvMonthCents: 0
    };
    isNewTenantModalOpen = true;
  }

  function handleSaveTenant() {
    if (!newTenant.name.trim()) return;
    if (!newTenant.slug.trim()) {
      newTenant.slug = newTenant.name.toLowerCase().replace(/[^\w]/g, '-');
    }
    newTenant.vitrineUrl = `https://app.cardaperp.com.br/${newTenant.slug}`;
    
    if (newTenant.plan === 'BASIC') newTenant.planPriceCents = 9900;
    else if (newTenant.plan === 'PRO_DELIVERY') newTenant.planPriceCents = 19900;
    else newTenant.planPriceCents = 34900;

    tenantManager.addTenant(newTenant);
    isNewTenantModalOpen = false;
    toastMessage = `Novo restaurante "${newTenant.name}" cadastrado e ativado na plataforma SaaS!`;
    setTimeout(() => toastMessage = '', 4000);
  }

  function getPlanBadge(plan: TenantPlan) {
    if (plan === 'BASIC') return 'BÁSICO (R$ 99/MÊS)';
    if (plan === 'PRO_DELIVERY') return 'PRO DELIVERY (R$ 199/MÊS)';
    return 'ENTERPRISE (R$ 349/MÊS)';
  }
</script>

<div class="space-y-6">
  <!-- Toast de Notificação -->
  {#if toastMessage}
    <div class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-900 uppercase flex items-center justify-between gap-2 shadow-xs">
      <div class="flex items-center gap-2">
        <Icon name="check" size={16} className="text-emerald-700" />
        <span>{toastMessage}</span>
      </div>
    </div>
  {/if}

  <!-- PanelHeader SuperAdmin SaaS -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Painel SuperAdmin SaaS — Plataforma Multi-Tenant CARDAP"
      subtitle="Gerencie estabelecimentos cadastrados, faturamento de assinaturas MRR e limites operacionais"
      index="SaaS"
    >
      <StatusBadge status="CONCLUIDO" text="SAAS OPERACIONAL" />
      <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenNewModal}>
        <Icon name="plus" size={14} className="mr-1" />
        Novo Restaurante / Tenant
      </PrimaryButton>
    </PanelHeader>
  </div>

  <!-- Métricas SaaS Globais (4 Cards) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard
      label="RESTAURANTES ATIVOS"
      value={String(activeCount)}
      trend="OPERACIONAIS"
      trendDirection="neutral"
      sublabel={`De ${$tenants.length} cadastrados no SaaS`}
    />

    <MetricCard
      label="RECEITA RECORRENTE (MRR)"
      value={fmt(totalMrrCents)}
      trend="+14.2%"
      trendDirection="up"
      sublabel="Assinaturas mensais de SaaS"
    />

    <MetricCard
      label="GMV GLOBAL PROCESSADO"
      value={fmt(totalGmvCents)}
      trend="+28.5%"
      trendDirection="up"
      sublabel="Vendas totais nos restaurantes (30d)"
    />

    <MetricCard
      label="PEDIDOS TOTAIS DO MÊS"
      value={totalOrders.toLocaleString('pt-BR')}
      trend="SISTEMA SAAS"
      trendDirection="neutral"
      sublabel="Processados no Vitrine & KDS"
    />
  </div>

  <!-- Tabela de Restaurantes / Tenants -->
  <div class="bg-white border border-slate-200 space-y-4 p-4">
    <div class="flex items-center justify-between border-b border-slate-200 pb-3 font-mono">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-widest text-slate-900">
          Estabelecimentos Cadastrados na Plataforma
        </h3>
        <span class="text-[11px] text-slate-500 font-sans">
          Alterne o contexto de trabalho com 1 clique para gerenciar o ERP de qualquer cliente.
        </span>
      </div>
      <span class="text-xs text-slate-600 font-bold">
        TENANT ATIVO: <strong class="text-red-600">{$activeTenant.name}</strong>
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs font-mono">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
            <th class="border-r border-slate-200 px-3 py-2">Restaurante / Estabelecimento</th>
            <th class="border-r border-slate-200 px-3 py-2">Slug Vitrine</th>
            <th class="border-r border-slate-200 px-3 py-2">Proprietário / CNPJ</th>
            <th class="border-r border-slate-200 px-3 py-2">Plano SaaS</th>
            <th class="border-r border-slate-200 px-3 py-2">GMV Mês</th>
            <th class="border-r border-slate-200 px-3 py-2">Status SaaS</th>
            <th class="px-3 py-2 text-right">Ações de Gerenciamento</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#each $tenants as t}
            <tr class="hover:bg-slate-50 transition-colors {t.id === $activeTenant.id ? 'bg-red-50/50' : ''}">
              <td class="border-r border-slate-100 px-3 py-2.5">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 font-sans flex items-center gap-1.5">
                      <span>{t.name}</span>
                      {#if t.id === $activeTenant.id}
                        <span class="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-bold uppercase">SESSÃO ATIVA</span>
                      {/if}
                    </div>
                    <div class="text-[10px] text-slate-500">{t.category}</div>
                  </div>
                </div>
              </td>

              <td class="border-r border-slate-100 px-3 py-2.5 text-slate-600">
                <a href={t.vitrineUrl} target="_blank" class="text-red-600 hover:underline font-bold">
                  /{t.slug}
                </a>
              </td>

              <td class="border-r border-slate-100 px-3 py-2.5 text-slate-700">
                <div class="font-bold">{t.ownerName}</div>
                <div class="text-[10px] text-slate-500">{t.ownerPhone} · CNPJ: {t.cnpj}</div>
              </td>

              <td class="border-r border-slate-100 px-3 py-2.5 font-bold">
                <span class="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px] text-slate-900">
                  {getPlanBadge(t.plan)}
                </span>
              </td>

              <td class="border-r border-slate-100 px-3 py-2.5">
                <div class="font-bold text-slate-900">{fmt(t.gmvMonthCents)}</div>
                <div class="text-[10px] text-slate-500">{t.totalOrdersMonth} pedidos</div>
              </td>

              <td class="border-r border-slate-100 px-3 py-2.5">
                <button
                  type="button"
                  class="px-2 py-0.5 text-[9px] font-bold uppercase border cursor-pointer {t.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : t.status === 'EM_TESTE' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-red-50 text-red-800 border-red-300'}"
                  on:click={() => tenantManager.toggleStatus(t.id)}
                >
                  {t.status}
                </button>
              </td>

              <td class="px-3 py-2.5 text-right space-x-1">
                {#if t.id !== $activeTenant.id}
                  <PrimaryButton size="sm" variant="primary" on:click={() => handleSelectTenantAndGo(t)}>
                    Gerenciar ERP
                  </PrimaryButton>
                {:else}
                  <span class="text-[10px] font-bold text-slate-400 uppercase">GERENCIANDO AGORA</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Onboarding Novo Restaurante (Criar Tenant) -->
<Modal
  isOpen={isNewTenantModalOpen}
  title="Onboarding de Novo Restaurante (SaaS Multi-Tenant)"
  subtitle="Cadastre um novo estabelecimento na plataforma CARDAP"
  maxWidth="lg"
  onClose={() => isNewTenantModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <div class="grid grid-cols-2 gap-3">
      <FormField label="Nome Fantasia do Restaurante:" name="tName" bind:value={newTenant.name} required />
      <FormField label="URL Slug (Subdomínio Vitrine):" name="tSlug" bind:value={newTenant.slug} placeholder="ex: espanka-burguer" mono />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="tCatSelect" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Categoria:</label>
        <select
          id="tCatSelect"
          bind:value={newTenant.category}
          class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="Hamburgueria Artesanal">Hamburgueria Artesanal</option>
          <option value="Pizzaria">Pizzaria & Forno a Lenha</option>
          <option value="Comida Regional / Alacarte">Comida Regional / Alacarte</option>
          <option value="Japonesa & Sushi">Japonesa & Sushi</option>
          <option value="Açaí & Doceria">Açaí & Doceria</option>
          <option value="Padaria & Confeitaria">Padaria & Confeitaria</option>
        </select>
      </div>

      <FormField label="CNPJ do Estabelecimento:" name="tCnpj" bind:value={newTenant.cnpj} placeholder="00.000.000/0001-00" mono required />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <FormField label="Nome do Proprietário / Responsável:" name="tOwner" bind:value={newTenant.ownerName} required />
      <FormField label="WhatsApp Comercial:" name="tPhone" bind:value={newTenant.ownerPhone} placeholder="(87) 99999-9999" mono required />
    </div>

    <div>
      <label for="tPlanSelect" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Plano de Assinatura SaaS:</label>
      <select
        id="tPlanSelect"
        bind:value={newTenant.plan}
        class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <option value="BASIC">Plano Básico (R$ 99,00/mês — Vitrine Digital + KDS)</option>
        <option value="PRO_DELIVERY">Plano Pro Delivery (R$ 199,00/mês — Vitrine + KDS + CRM + WhatsApp Bot)</option>
        <option value="ENTERPRISE">Plano Enterprise (R$ 349,00/mês — Multi-loja + Relatórios DRE + MP/Ton TEF)</option>
      </select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isNewTenantModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveTenant}>Ativar Restaurante no SaaS</PrimaryButton>
  </svelte:fragment>
</Modal>
