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

  export let data: any = {};

  const { tenants, activeTenant, selectTenant } = tenantManager;

  let isNewTenantModalOpen = false;
  let isEditTenantModalOpen = false;
  let isDeleteModalOpen = false;
  let tenantToDelete: Tenant | null = null;
  let isSaving = false;
  let toastMessage = '';

  $: if (data?.tenants && data.tenants.length > 0) {
    tenants.set(data.tenants);
    if (!$activeTenant || !$activeTenant.id) {
      tenantManager.selectTenant(data.tenants[0].id);
    }
  }

  async function loadRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.restaurants) {
          tenants.set(data.restaurants);
          if ((!$activeTenant || !$activeTenant.id) && data.restaurants.length > 0) {
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

  let newTenant: any = {
    name: '',
    slug: '',
    category: 'Hamburgueria Artesanal',
    cnpj: '',
    ownerName: '',
    ownerPhone: '',
    email: '',
    plan: 'PRO_DELIVERY',
    status: 'ATIVO'
  };

  let editingTenant: any = {
    id: '',
    name: '',
    slug: '',
    category: '',
    cnpj: '',
    ownerPhone: '',
    email: '',
    plan: 'PRO_DELIVERY',
    status: 'ATIVO'
  };

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  $: activeCount = $tenants.filter(t => t.status === 'ATIVO').length;
  $: totalMrrCents = $tenants.filter(t => t.status !== 'SUSPENSO').reduce((acc, t) => acc + (t.planPriceCents || 0), 0);

  function handleSelectTenantAndGo(t: Tenant) {
    tenantManager.selectTenant(t.id);
    toastMessage = `Contexto ERP alterado com sucesso para "${t.name}"!`;
    setTimeout(() => toastMessage = '', 3500);
    goto('/gestao');
  }

  function handleOpenNewModal() {
    newTenant = {
      name: '',
      slug: '',
      category: 'Hamburgueria Artesanal',
      cnpj: '',
      ownerName: '',
      ownerPhone: '',
      email: '',
      plan: 'PRO_DELIVERY',
      status: 'ATIVO'
    };
    isNewTenantModalOpen = true;
  }

  function handleOpenEditModal(t: Tenant) {
    editingTenant = {
      id: t.id,
      name: t.name,
      slug: t.slug,
      category: t.category,
      cnpj: t.cnpj,
      ownerPhone: t.ownerPhone,
      email: (t as any).email || '',
      plan: t.plan,
      status: t.status
    };
    isEditTenantModalOpen = true;
  }

  function handleOpenDeleteModal(t: Tenant) {
    tenantToDelete = t;
    isDeleteModalOpen = true;
  }

  async function handleSaveNewTenant() {
    if (!newTenant.name.trim()) {
      alert('Por favor, informe o nome do restaurante.');
      return;
    }

    try {
      isSaving = true;
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toastMessage = `Restaurante "${newTenant.name}" cadastrado com sucesso!`;
        isNewTenantModalOpen = false;
        await loadRestaurants();
      } else {
        alert(resData.error || 'Erro ao cadastrar restaurante.');
      }
    } catch (e: any) {
      alert('Erro de conexão ao salvar restaurante: ' + e.message);
    } finally {
      isSaving = false;
      setTimeout(() => toastMessage = '', 4000);
    }
  }

  async function handleSaveEditTenant() {
    if (!editingTenant.name.trim()) {
      alert('O nome do restaurante não pode ser vazio.');
      return;
    }

    try {
      isSaving = true;
      const res = await fetch('/api/restaurants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTenant)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toastMessage = `Dados do restaurante "${editingTenant.name}" atualizados com sucesso!`;
        isEditTenantModalOpen = false;
        await loadRestaurants();
      } else {
        alert(resData.error || 'Erro ao atualizar restaurante.');
      }
    } catch (e: any) {
      alert('Erro de conexão ao atualizar restaurante: ' + e.message);
    } finally {
      isSaving = false;
      setTimeout(() => toastMessage = '', 4000);
    }
  }

  async function handleToggleStatus(t: Tenant) {
    const nextStatus = t.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
    try {
      const res = await fetch('/api/restaurants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, status: nextStatus })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toastMessage = `Status de "${t.name}" alterado para ${nextStatus}!`;
        await loadRestaurants();
      } else {
        alert(resData.error || 'Erro ao alterar status.');
      }
    } catch (e: any) {
      alert('Erro ao alterar status: ' + e.message);
    } finally {
      setTimeout(() => toastMessage = '', 3500);
    }
  }

  async function handleConfirmDelete() {
    if (!tenantToDelete) return;

    try {
      isSaving = true;
      const res = await fetch(`/api/restaurants?id=${tenantToDelete.id}`, {
        method: 'DELETE'
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toastMessage = `Restaurante "${tenantToDelete.name}" excluído com sucesso!`;
        isDeleteModalOpen = false;
        tenantToDelete = null;
        await loadRestaurants();
      } else {
        alert(resData.error || 'Erro ao excluir restaurante.');
      }
    } catch (e: any) {
      alert('Erro de conexão ao excluir restaurante: ' + e.message);
    } finally {
      isSaving = false;
      setTimeout(() => toastMessage = '', 4000);
    }
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
      title="Painel SuperAdmin SaaS — Gestão de Estabelecimentos"
      subtitle="Gerencie estabelecimentos cadastrados, planos de assinatura e liberação de acesso"
      index="SaaS"
    >
      <StatusBadge status="CONCLUIDO" text="SAAS OPERACIONAL" />
      <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenNewModal}>
        <Icon name="plus" size={14} className="mr-1" />
        Novo Restaurante
      </PrimaryButton>
    </PanelHeader>
  </div>

  <!-- Métricas SaaS Globais (4 Cards) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <MetricCard
      label="RESTAURANTES ATIVOS"
      value={String(activeCount)}
      trend="OPERACIONAIS"
      trendDirection="neutral"
      sublabel={`De ${$tenants.length} cadastrados no sistema`}
    />

    <MetricCard
      label="RECEITA RECORRENTE (MRR)"
      value={fmt(totalMrrCents)}
      trend="MENSAL"
      trendDirection="up"
      sublabel="Assinaturas ativas de SaaS"
    />

    <MetricCard
      label="TOTAL DE ESTABELECIMENTOS"
      value={String($tenants.length)}
      trend="BASE SAAS"
      trendDirection="neutral"
      sublabel="Clientes cadastrados na plataforma"
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
          Crie, edite, ative, desative ou gerencie qualquer estabelecimento da plataforma.
        </span>
      </div>
      <span class="text-xs text-slate-600 font-bold">
        ESTABELECIMENTO ATIVO: <strong class="text-red-600">{$activeTenant.name}</strong>
      </span>
    </div>

    {#if $tenants.length === 0}
      <div class="p-10 border-2 border-dashed border-slate-200 text-center space-y-3">
        <div class="text-3xl">🏪</div>
        <div class="font-bold text-slate-800 text-sm font-mono uppercase">Nenhum estabelecimento cadastrado</div>
        <p class="text-slate-500 font-sans text-xs max-w-sm mx-auto">
          Clique no botão "Novo Restaurante" acima para cadastrar o primeiro cliente da plataforma.
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
              <th class="border-r border-slate-200 px-3 py-2">Restaurante / Estabelecimento</th>
              <th class="border-r border-slate-200 px-3 py-2">Slug Vitrine</th>
              <th class="border-r border-slate-200 px-3 py-2">Contato / CNPJ</th>
              <th class="border-r border-slate-200 px-3 py-2">Plano SaaS</th>
              <th class="border-r border-slate-200 px-3 py-2">Status</th>
              <th class="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each $tenants as t}
              <tr class="hover:bg-slate-50 transition-colors {t.id === $activeTenant.id ? 'bg-red-50/40' : ''}">
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
                    /{t.slug} ↗
                  </a>
                </td>

                <td class="border-r border-slate-100 px-3 py-2.5 text-slate-700">
                  <div class="font-bold">{t.ownerPhone || 'Sem telefone'}</div>
                  <div class="text-[10px] text-slate-500">{t.cnpj ? `CNPJ: ${t.cnpj}` : 'Sem CNPJ'}</div>
                </td>

                <td class="border-r border-slate-100 px-3 py-2.5 font-bold">
                  <span class="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px] text-slate-900">
                    {getPlanBadge(t.plan)}
                  </span>
                </td>

                <td class="border-r border-slate-100 px-3 py-2.5">
                  <button
                    type="button"
                    class="px-2 py-0.5 text-[9px] font-bold uppercase border cursor-pointer transition-colors {t.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'}"
                    on:click={() => handleToggleStatus(t)}
                    title="Clique para alternar o status do estabelecimento"
                  >
                    {t.status === 'ATIVO' ? '🟢 ATIVO' : '🔴 SUSPENSO'}
                  </button>
                </td>

                <td class="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                  {#if t.id !== $activeTenant.id}
                    <PrimaryButton size="sm" variant="primary" on:click={() => handleSelectTenantAndGo(t)}>
                      Gerenciar ERP
                    </PrimaryButton>
                  {:else}
                    <span class="text-[10px] font-bold text-emerald-700 uppercase mr-1">GERENCIANDO</span>
                  {/if}

                  <button
                    type="button"
                    class="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-[10px] uppercase transition-colors cursor-pointer"
                    on:click={() => handleOpenEditModal(t)}
                    title="Editar informações do estabelecimento"
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 font-bold text-[10px] uppercase transition-colors cursor-pointer"
                    on:click={() => handleOpenDeleteModal(t)}
                    title="Excluir estabelecimento"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Modal Novo Restaurante (Criar Tenant) -->
<Modal
  isOpen={isNewTenantModalOpen}
  title="Cadastrar Novo Estabelecimento"
  subtitle="Cadastre um novo restaurante na plataforma CARDAP"
  maxWidth="lg"
  onClose={() => isNewTenantModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <div class="grid grid-cols-2 gap-3">
      <FormField label="Nome Fantasia do Restaurante:" name="tName" bind:value={newTenant.name} required />
      <FormField label="Slug da Vitrine (URL):" name="tSlug" bind:value={newTenant.slug} placeholder="ex: hamburgueria-do-ze" mono />
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
          <option value="Pizzaria & Forneria">Pizzaria & Forneria</option>
          <option value="Pastelaria & Salgados">Pastelaria & Salgados</option>
          <option value="Comida Regional / Alacarte">Comida Regional / Alacarte</option>
          <option value="Japonesa & Sushi">Japonesa & Sushi</option>
          <option value="Açaí & Doceria">Açaí & Doceria</option>
          <option value="Padaria & Confeitaria">Padaria & Confeitaria</option>
          <option value="Bebidas & Adega">Bebidas & Adega</option>
        </select>
      </div>

      <FormField label="CNPJ do Estabelecimento:" name="tCnpj" bind:value={newTenant.cnpj} placeholder="00.000.000/0001-00" mono />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <FormField label="WhatsApp Comercial:" name="tPhone" bind:value={newTenant.ownerPhone} placeholder="(87) 99999-9999" mono />
      <FormField label="E-mail de Contato:" name="tEmail" bind:value={newTenant.email} placeholder="contato@restaurante.com.br" mono />
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
        <option value="ENTERPRISE">Plano Enterprise (R$ 349,00/mês — Multi-loja + Relatórios DRE + Gateways TEF)</option>
      </select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isNewTenantModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveNewTenant} disabled={isSaving}>
      {isSaving ? 'Cadastrando...' : 'Cadastrar Estabelecimento'}
    </PrimaryButton>
  </svelte:fragment>
</Modal>

<!-- Modal Editar Restaurante -->
<Modal
  isOpen={isEditTenantModalOpen}
  title="Editar Estabelecimento"
  subtitle={`Atualize as informações cadastrais de "${editingTenant.name}"`}
  maxWidth="lg"
  onClose={() => isEditTenantModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <div class="grid grid-cols-2 gap-3">
      <FormField label="Nome do Restaurante:" name="editName" bind:value={editingTenant.name} required />
      <FormField label="Slug da Vitrine (URL):" name="editSlug" bind:value={editingTenant.slug} mono />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <FormField label="Categoria de Culinária:" name="editCategory" bind:value={editingTenant.category} />
      <FormField label="CNPJ:" name="editCnpj" bind:value={editingTenant.cnpj} mono />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <FormField label="WhatsApp Comercial:" name="editPhone" bind:value={editingTenant.ownerPhone} mono />
      <FormField label="E-mail de Contato:" name="editEmail" bind:value={editingTenant.email} mono />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="editPlanSelect" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Plano SaaS:</label>
        <select
          id="editPlanSelect"
          bind:value={editingTenant.plan}
          class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="BASIC">Plano Básico (R$ 99/mês)</option>
          <option value="PRO_DELIVERY">Plano Pro Delivery (R$ 199/mês)</option>
          <option value="ENTERPRISE">Plano Enterprise (R$ 349/mês)</option>
        </select>
      </div>

      <div>
        <label for="editStatusSelect" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Status:</label>
        <select
          id="editStatusSelect"
          bind:value={editingTenant.status}
          class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="ATIVO">🟢 Ativo (Operacional)</option>
          <option value="SUSPENSO">🔴 Suspenso (Acesso Bloqueado)</option>
        </select>
      </div>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isEditTenantModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveEditTenant} disabled={isSaving}>
      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
    </PrimaryButton>
  </svelte:fragment>
</Modal>

<!-- Modal Confirmar Exclusão -->
<Modal
  isOpen={isDeleteModalOpen}
  title="Excluir Estabelecimento"
  subtitle="Atenção: esta ação é irreversível e excluirá os dados deste restaurante."
  maxWidth="md"
  onClose={() => isDeleteModalOpen = false}
>
  <div class="space-y-3 font-mono text-xs">
    <div class="p-3 bg-red-50 border-2 border-red-600 text-red-900 font-bold">
      ⚠️ Deseja realmente excluir o restaurante <strong>"{tenantToDelete?.name}"</strong>?
    </div>
    <p class="text-slate-600 font-sans text-xs">
      Todos os colaboradores, cardápios e configurações vinculados a este restaurante serão removidos permanentemente.
    </p>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isDeleteModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="danger" on:click={handleConfirmDelete} disabled={isSaving}>
      {isSaving ? 'Excluindo...' : 'Sim, Excluir Restaurante'}
    </PrimaryButton>
  </svelte:fragment>
</Modal>
