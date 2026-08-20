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
  let isHistoryModalOpen = false;
  let selectedCustomer: any = null;
  let isLoading = false;
  let isSaving = false;

  let apiCustomers: any[] = [];
  let vipCount = 0;

  let newCustomer = {
    name: '',
    phone: '',
    addressStreet: '',
    addressNumber: '',
    addressNeighborhood: '',
    addressComplement: ''
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
              address: c.address,
              totalOrdersCount: c.totalOrdersCount,
              totalSpentCents: c.totalSpentCents,
              totalSpentFormatted: c.totalSpentFormatted,
              lastOrderDate: c.lastOrderDateFormatted || 'Recente',
              tags: c.tags,
              orders: c.orders || []
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
    c.phone.includes(searchTerm) ||
    (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  function handleOpenAdd() {
    newCustomer = {
      name: '',
      phone: '',
      addressStreet: '',
      addressNumber: '',
      addressNeighborhood: '',
      addressComplement: ''
    };
    isAddModalOpen = true;
  }

  async function handleSaveCustomer() {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) return;
    try {
      isSaving = true;
      const res = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      if (res.ok) {
        await loadCustomers();
        isAddModalOpen = false;
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
    } finally {
      isSaving = false;
    }
  }

  function handleOpenHistory(customer: any) {
    selectedCustomer = customer;
    isHistoryModalOpen = true;
  }
</script>

<div class="space-y-6 font-sans">
  <!-- PanelHeader do Módulo de Clientes -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Gestão da Base de Clientes"
      subtitle={`Histórico de compras, fidelidade e sincronização em tempo real de ${$activeTenant.name}`}
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
          placeholder="Buscar por nome, telefone ou endereço..."
          bind:value={searchTerm}
          class="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          on:click={loadCustomers}
          class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-mono text-xs font-bold uppercase transition-colors"
        >
          {isLoading ? 'Atualizando...' : '🔄 Sincronizar'}
        </button>

        <span class="text-slate-500 text-[11px]">
          Exibindo {filteredCustomers.length} de {$customerStore.length} clientes
        </span>
      </div>
    </div>

    <!-- Tabela de Clientes -->
    <div class="border border-slate-200 overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
          <tr>
            <th class="p-3 border-r border-slate-800">Cliente</th>
            <th class="p-3 border-r border-slate-800">WhatsApp</th>
            <th class="p-3 border-r border-slate-800">Endereço Principal</th>
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
              <td colspan="8" class="p-8 text-center text-slate-400 font-sans">
                {#if isLoading}
                  Carregando base de clientes do banco de dados...
                {:else}
                  Nenhum cliente cadastrado no momento. Clientes cadastrados na vitrine aparecerão aqui automaticamente.
                {/if}
              </td>
            </tr>
          {:else}
            {#each filteredCustomers as customer}
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-bold text-slate-900 border-r border-slate-200">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                    <span>{customer.name}</span>
                  </div>
                </td>
                <td class="p-3 font-bold text-emerald-800 border-r border-slate-200 whitespace-nowrap">
                  {customer.phone}
                </td>
                <td class="p-3 text-slate-600 border-r border-slate-200 max-w-xs truncate" title={customer.address}>
                  {customer.address || 'Não cadastrado'}
                </td>
                <td class="p-3 border-r border-slate-200 whitespace-nowrap">
                  <span class="font-bold text-slate-900">{customer.totalOrdersCount}</span> pedidos
                </td>
                <td class="p-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                  {customer.totalSpentFormatted}
                </td>
                <td class="p-3 text-slate-600 border-r border-slate-200 whitespace-nowrap">
                  {customer.lastOrderDate}
                </td>
                <td class="p-3 border-r border-slate-200 space-x-1 whitespace-nowrap">
                  {#each customer.tags as tag}
                    <span class="px-2 py-0.5 text-[9px] font-bold uppercase {tag === 'VIP' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-300'}">
                      {tag}
                    </span>
                  {/each}
                </td>
                <td class="p-3 text-right whitespace-nowrap space-x-1.5">
                  <button
                    type="button"
                    on:click={() => handleOpenHistory(customer)}
                    class="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1 cursor-pointer"
                  >
                    📋 Histórico
                  </button>

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
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="md:col-span-2">
        <FormField label="Rua / Logradouro:" name="cliStreet" bind:value={newCustomer.addressStreet} placeholder="Ex: Av. Central" />
      </div>
      <div>
        <FormField label="Número:" name="cliNum" bind:value={newCustomer.addressNumber} placeholder="123" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FormField label="Bairro:" name="cliNeigh" bind:value={newCustomer.addressNeighborhood} placeholder="Centro" />
      <FormField label="Complemento:" name="cliComp" bind:value={newCustomer.addressComplement} placeholder="Apto 101" />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isAddModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" disabled={isSaving} on:click={handleSaveCustomer}>
      {isSaving ? 'Salvando...' : 'Salvar Cliente'}
    </PrimaryButton>
  </svelte:fragment>
</Modal>

<!-- Modal Histórico de Pedidos do Cliente -->
<Modal
  isOpen={isHistoryModalOpen}
  title={`Histórico de Pedidos - ${selectedCustomer?.name || 'Cliente'}`}
  subtitle={`WhatsApp: ${selectedCustomer?.phone || ''} | Total Gasto: ${selectedCustomer?.totalSpentFormatted || 'R$ 0,00'}`}
  maxWidth="lg"
  onClose={() => isHistoryModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <div class="bg-slate-50 border border-slate-200 p-3 flex justify-between items-center">
      <div>
        <span class="text-slate-500 uppercase text-[10px] block">ENDEREÇO CADASTRADO:</span>
        <span class="font-bold text-slate-800">{selectedCustomer?.address || 'Não cadastrado'}</span>
      </div>
      <div class="text-right">
        <span class="text-slate-500 uppercase text-[10px] block">TOTAL DE PEDIDOS:</span>
        <span class="font-bold text-slate-900">{selectedCustomer?.totalOrdersCount || 0} pedidos</span>
      </div>
    </div>

    {#if selectedCustomer?.orders && selectedCustomer.orders.length > 0}
      <div class="border border-slate-200 divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {#each selectedCustomer.orders as order}
          <div class="p-3 space-y-1 hover:bg-slate-50 transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900">Pedido #{order.orderNumber || order.id.slice(0, 6)}</span>
                <span class="text-slate-400">·</span>
                <span class="text-slate-500 text-[11px]">{order.createdAtFormatted}</span>
                <span class="px-2 py-0.2 bg-slate-100 text-slate-700 text-[9px] font-bold uppercase">{order.type}</span>
              </div>
              <div class="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <span class="font-bold text-slate-900">{order.totalFormatted}</span>
              </div>
            </div>
            {#if order.itemsSummary}
              <p class="text-slate-600 font-sans text-xs pt-1">
                {order.itemsSummary}
              </p>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="p-8 text-center text-slate-400 border border-dashed border-slate-200">
        Nenhum pedido registrado para este cliente ainda.
      </div>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isHistoryModalOpen = false}>Fechar</PrimaryButton>
    {#if selectedCustomer?.phone}
      <a
        href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`}
        target="_blank"
        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase inline-flex items-center gap-1.5"
      >
        💬 Abrir WhatsApp
      </a>
    {/if}
  </svelte:fragment>
</Modal>
