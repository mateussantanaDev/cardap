<script lang="ts">
  import { onMount } from 'svelte';
  import { customerStore, type Customer } from '$stores/customerStore';
  import { tenantManager } from '$stores/tenantStore';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Modal from '$ui/Modal.svelte';
  import Icon from '$components/Icon.svelte';

  export let data: any = {};

  const { activeTenant } = tenantManager;

  let searchTerm = '';
  let isAddModalOpen = false;
  let isLoading = false;

  let apiCustomers: any[] = [];
  let vipCount = 0;

  $: if (data?.customers && data.customers.length > 0) {
    customerStore.setCustomers(data.customers);
  }
  $: if (data?.vipCount !== undefined) {
    vipCount = data.vipCount;
  }

  let newCustomer: Customer = {
    id: '',
    name: '',
    phone: '',
    address: '',
    totalOrdersCount: 1,
    totalSpentCents: 4500,
    totalSpentFormatted: 'R$ 45,00',
    lastOrderDate: '17/08/2026',
    tags: ['NOVO']
  };

  async function loadCustomers() {
    try {
      isLoading = true;
      const res = await fetch('/api/crm/customers');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          apiCustomers = data.customers || [];
          vipCount = data.vipCount || 0;
          if (apiCustomers.length > 0) {
            customerStore.setCustomers(apiCustomers.map(c => ({
              id: c.id,
              name: c.name,
              phone: c.formattedPhone || c.phone,
              address: 'Endereço Principal',
              totalOrdersCount: c.totalOrdersCount,
              totalSpentCents: c.totalSpentCents,
              totalSpentFormatted: c.totalSpentFormatted,
              lastOrderDate: c.lastOrderDateFormatted || 'Recente',
              tags: c.tags
            })));
          }
        }
      }
    } catch (err) {
      console.warn('[Clientes UI] Usando estado local de backup do customerStore');
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadCustomers();
  });

  $: filteredCustomers = $customerStore.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  function handleOpenAdd() {
    newCustomer = {
      id: `cli-${Date.now()}`,
      name: '',
      phone: '',
      address: '',
      totalOrdersCount: 1,
      totalSpentCents: 0,
      totalSpentFormatted: 'R$ 0,00',
      lastOrderDate: 'Hoje',
      tags: ['NOVO']
    };
    isAddModalOpen = true;
  }

  function handleSaveCustomer() {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) return;
    customerStore.addCustomer(newCustomer);
    isAddModalOpen = false;
  }
</script>

<div class="space-y-6">
  <!-- PanelHeader do Módulo de Clientes -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Gestão da Base de Clientes"
      subtitle={`Histórico de compras, fidelidade e sincronização de pedidos de ${$activeTenant.name}`}
      index="09"
    >
      <div class="flex items-center gap-2">
        <a
          href="/gestao/configuracoes"
          class="px-3 py-1 font-mono text-xs font-bold uppercase border bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1.5"
        >
          <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Conexão WhatsApp (WAHA) ⚙️
        </a>

        <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenAdd}>
          <Icon name="plus" size={14} className="mr-1" />
          Novo Cliente
        </PrimaryButton>
      </div>
    </PanelHeader>
  </div>

  <!-- MetricCards Clientes -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <MetricCard
      label="Total de Clientes"
      value={`${$customerStore.length} Cadastrados`}
      sublabel={`Base sincronizada no ERP (${$activeTenant.name})`}
      accent="default"
    />

    <MetricCard
      label="Clientes VIP (LTV R$ 200+)"
      value={`${vipCount || $customerStore.filter(c => c.tags.includes('VIP')).length} Clientes VIP`}
      sublabel="Ranqueados automaticamente pelo LTV"
      accent="success"
    />

    <MetricCard
      label="Engine WhatsApp & Bot"
      value="WAHA Active"
      sublabel="Automação & Confirmação de Pedidos"
      accent="default"
    />
  </div>

  <!-- Lista de Clientes -->
  <div class="bg-white border border-slate-200 p-4 space-y-4 font-mono text-xs">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div class="flex items-center gap-2 flex-1 max-w-md">
        <Icon name="search" size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou WhatsApp..."
          bind:value={searchTerm}
          class="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      <span class="text-slate-500 text-[11px]">
        Exibindo {filteredCustomers.length} de {$customerStore.length} clientes
      </span>
    </div>

    <!-- Tabela de Clientes -->
    <div class="border border-slate-200 overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
          <tr>
            <th class="p-3 border-r border-slate-800">Cliente</th>
            <th class="p-3 border-r border-slate-800">WhatsApp</th>
            <th class="p-3 border-r border-slate-800">Total Pedidos</th>
            <th class="p-3 border-r border-slate-800">Valor Gasto (LTV)</th>
            <th class="p-3 border-r border-slate-800">Último Pedido</th>
            <th class="p-3 border-r border-slate-800">Tags</th>
            <th class="p-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {#if filteredCustomers.length === 0}
            <tr>
              <td colspan="7" class="p-8 text-center text-slate-400 font-sans">
                Nenhum cliente encontrado com os filtros aplicados.
              </td>
            </tr>
          {:else}
            {#each filteredCustomers as customer}
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-bold text-slate-900 border-r border-slate-200">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                    <span>{customer.name}</span>
                  </div>
                </td>
                <td class="p-3 font-bold text-emerald-800 border-r border-slate-200">
                  {customer.phone}
                </td>
                <td class="p-3 border-r border-slate-200">
                  <span class="font-bold text-slate-900">{customer.totalOrdersCount}</span> pedidos
                </td>
                <td class="p-3 font-bold text-slate-900 border-r border-slate-200">
                  {customer.totalSpentFormatted}
                </td>
                <td class="p-3 text-slate-600 border-r border-slate-200">
                  {customer.lastOrderDate}
                </td>
                <td class="p-3 border-r border-slate-200 space-x-1">
                  {#each customer.tags as tag}
                    <span class="px-2 py-0.5 text-[9px] font-bold uppercase {tag === 'VIP' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-300'}">
                      {tag}
                    </span>
                  {/each}
                </td>
                <td class="p-3 text-right">
                  <a
                    href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1"
                  >
                    💬 WhatsApp
                  </a>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Novo Cliente -->
<Modal
  isOpen={isAddModalOpen}
  title="Cadastrar Novo Cliente"
  subtitle="Adicione informações para fidelidade e histórico de pedidos"
  maxWidth="md"
  onClose={() => isAddModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <FormField label="Nome Completo:" name="cliName" bind:value={newCustomer.name} required />
    <FormField label="WhatsApp / Telefone:" name="cliPhone" bind:value={newCustomer.phone} placeholder="(87) 9 9999-9999" mono required />
    <FormField label="Endereço Padrão (Opcional):" name="cliAddress" bind:value={newCustomer.address} />
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isAddModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveCustomer}>Salvar Cliente</PrimaryButton>
  </svelte:fragment>
</Modal>
