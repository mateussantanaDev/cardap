<script lang="ts">
  import { inventoryStore, type InventoryItem } from '$stores/inventoryStore';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Modal from '$ui/Modal.svelte';
  import Icon from '$components/Icon.svelte';

  export let data: any = {};

  let searchTerm = '';
  let isAddModalOpen = false;

  $: if (data?.inventoryItems && data.inventoryItems.length > 0) {
    inventoryStore.set(data.inventoryItems);
  }

  let newItem: InventoryItem = {
    id: '',
    code: '',
    name: '',
    category: 'INSUMO',
    currentQuantity: 10,
    unit: 'KG',
    minQuantity: 5,
    unitCostCents: 1000,
    supplier: '',
    lastRestockDate: '13/08/2026',
    status: 'NORMAL'
  };

  let rawCostInput = '10,00';

  $: filteredInventory = $inventoryStore.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  $: countCritico = $inventoryStore.filter(i => i.status === 'CRITICO').length;
  $: countBaixo = $inventoryStore.filter(i => i.status === 'BAIXO').length;

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  function handleOpenAdd() {
    newItem = {
      id: `inv-${Date.now()}`,
      code: `INS-0${$inventoryStore.length + 1}`,
      name: '',
      category: 'INSUMO',
      currentQuantity: 10,
      unit: 'KG',
      minQuantity: 5,
      unitCostCents: 1000,
      supplier: 'Fornecedor Principal',
      lastRestockDate: '13/08/2026',
      status: 'NORMAL'
    };
    rawCostInput = '10,00';
    isAddModalOpen = true;
  }

  function handleSaveNewItem() {
    if (!newItem.name.trim()) return;
    const cleanCost = rawCostInput.replace(/[^\d,]/g, '').replace(',', '.');
    newItem.unitCostCents = Math.round(parseFloat(cleanCost) * 100) || 1000;
    inventoryStore.addItem(newItem);
    isAddModalOpen = false;
  }

  function handleUpdateQty(item: InventoryItem, delta: number) {
    const nextQty = Math.max(0, item.currentQuantity + delta);
    inventoryStore.updateQuantity(item.id, nextQty);
  }
</script>

<div class="space-y-6">
  <!-- PanelHeader do Módulo de Estoque Spec 2.0.0 -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Gestão de Estoque & Controle de Insumos"
      subtitle="Controle de matérias-primas, alertas de reposição mínima e valor investido"
      index="07"
    >
      <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenAdd}>
        <Icon name="plus" size={14} className="mr-1" />
        Novo Insumo
      </PrimaryButton>
    </PanelHeader>
  </div>

  <!-- MetricCards Regra 70/20/10 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <MetricCard
      label="Total de Insumos"
      value={`${$inventoryStore.length} Itens`}
      sublabel="Cadastrados no catálogo"
      accent="default"
    />

    <MetricCard
      label="Alertas de Reposição"
      value={`${countCritico} Crítico | ${countBaixo} Baixo`}
      sublabel="Matérias-primas abaixo do estoque mínimo"
      accent={countCritico > 0 ? 'critical' : 'amber'}
    />

    <MetricCard
      label="Valor Estimado em Estoque"
      value="R$ 4.820,00"
      sublabel="Custo total de inventário ativo"
      accent="success"
    />
  </div>

  <!-- Barra de Busca & Tabela Densa -->
  <div class="bg-white border border-slate-200 p-4 space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div class="w-72">
        <FormField
          label=""
          name="searchTerm"
          bind:value={searchTerm}
          placeholder="Buscar por código ou nome do insumo..."
          mono
        />
      </div>

      <span class="font-mono text-xs text-slate-500 uppercase">
        Exibindo {filteredInventory.length} de {$inventoryStore.length} insumos
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs font-mono">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
            <th class="border-r border-slate-200 px-3 py-2">Código</th>
            <th class="border-r border-slate-200 px-3 py-2">Insumo / Matéria-Prima</th>
            <th class="border-r border-slate-200 px-3 py-2">Categoria</th>
            <th class="border-r border-slate-200 px-3 py-2">Saldo Atual</th>
            <th class="border-r border-slate-200 px-3 py-2">Mínimo</th>
            <th class="border-r border-slate-200 px-3 py-2">Custo Un.</th>
            <th class="border-r border-slate-200 px-3 py-2">Status</th>
            <th class="px-3 py-2 text-right">Ajuste de Saldo</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if filteredInventory.length === 0}
            <tr>
              <td colspan="8" class="p-8 text-center text-slate-500 font-sans text-xs">
                Nenhum insumo ou produto cadastrado no estoque. Clique em "Cadastrar Insumo" acima para iniciar o controle.
              </td>
            </tr>
          {:else}
            {#each filteredInventory as item}
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-red-600">{item.code}</td>
                <td class="border-r border-slate-100 px-3 py-2.5">
                  <span class="font-bold text-slate-900 font-sans block">{item.name}</span>
                  <span class="text-[10px] text-slate-500 font-sans block">Fornecedor: {item.supplier}</span>
                </td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-700">
                  <span class="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px]">
                    {item.category}
                  </span>
                </td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900 text-sm">
                  {item.currentQuantity} {item.unit}
                </td>
                <td class="border-r border-slate-100 px-3 py-2.5 text-slate-600">
                  {item.minQuantity} {item.unit}
                </td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900">
                  {fmt(item.unitCostCents)}
                </td>
                <td class="border-r border-slate-100 px-3 py-2.5">
                  <StatusBadge
                    status={item.status === 'CRITICO' ? 'ATRASADO' : item.status === 'BAIXO' ? 'ATENCAO' : 'CONCLUIDO'}
                    text={item.status}
                  />
                </td>
                <td class="px-3 py-2.5 text-right space-x-1">
                  <button
                    type="button"
                    class="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-900 cursor-pointer"
                    on:click={() => handleUpdateQty(item, -1)}
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-900 cursor-pointer"
                    on:click={() => handleUpdateQty(item, +1)}
                  >
                    +1
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Novo Insumo -->
<Modal
  isOpen={isAddModalOpen}
  title="Cadastrar Novo Insumo no Estoque"
  subtitle="Defina código, categoria, custo unitário e estoque mínimo"
  maxWidth="md"
  onClose={() => isAddModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <div class="grid grid-cols-2 gap-3">
      <FormField label="Código SKU:" name="itemCode" bind:value={newItem.code} mono required />
      <div>
        <label for="catSelect" class="block text-[10px] uppercase font-bold text-slate-700 mb-1 tracking-widest">Categoria:</label>
        <select
          id="catSelect"
          bind:value={newItem.category}
          class="w-full p-2 bg-white border border-slate-300 font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="INSUMO">INSUMO / MATÉRIA-PRIMA</option>
          <option value="EMBALAGEM">EMBALAGEM</option>
          <option value="BEBIDA_REVEC">BEBIDA REVENDA</option>
        </select>
      </div>
    </div>

    <FormField label="Nome do Insumo:" name="itemName" bind:value={newItem.name} required />

    <div class="grid grid-cols-3 gap-3">
      <FormField label="Saldo Inicial:" name="itemQty" type="number" bind:value={newItem.currentQuantity} mono />
      <div>
        <label for="unitSelect" class="block text-[10px] uppercase font-bold text-slate-700 mb-1 tracking-widest">Unidade:</label>
        <select
          id="unitSelect"
          bind:value={newItem.unit}
          class="w-full p-2 bg-white border border-slate-300 font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="KG">Quilo (KG)</option>
          <option value="L">Litro (L)</option>
          <option value="UN">Unidade (UN)</option>
          <option value="CX">Caixa (CX)</option>
        </select>
      </div>
      <FormField label="Mínimo Alerta:" name="itemMinQty" type="number" bind:value={newItem.minQuantity} mono />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <FormField label="Custo Unitário (R$):" name="rawCost" bind:value={rawCostInput} mono />
      <FormField label="Fornecedor:" name="itemSupplier" bind:value={newItem.supplier} />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isAddModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveNewItem}>Salvar Insumo</PrimaryButton>
  </svelte:fragment>
</Modal>
