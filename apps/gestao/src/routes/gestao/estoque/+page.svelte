<script lang="ts">
  import { inventoryStore, type InventoryItem } from '$stores/inventoryStore';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Modal from '$ui/Modal.svelte';
  import Icon from '$components/Icon.svelte';
  import { onMount } from 'svelte';

  export let data: any = {};

  let searchTerm = '';
  let isAddModalOpen = false;
  let isDeleteModalOpen = false;
  let itemToDelete: InventoryItem | null = null;
  let isSaving = false;
  let feedbackToast = '';

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
    lastRestockDate: '',
    status: 'NORMAL'
  };

  let rawCostInput = '10,00';

  async function loadInventory() {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.items) {
          inventoryStore.set(result.items);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar estoque:', e);
    }
  }

  onMount(() => {
    loadInventory();
  });

  $: filteredInventory = $inventoryStore.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  $: countCritico = $inventoryStore.filter(i => i.status === 'CRITICO').length;
  $: countBaixo = $inventoryStore.filter(i => i.status === 'BAIXO').length;

  $: totalStockValueCents = $inventoryStore.reduce((sum, item) => {
    return sum + Math.round(Number(item.currentQuantity) * Number(item.unitCostCents));
  }, 0);

  $: totalStockValueFormatted = `R$ ${(totalStockValueCents / 100).toFixed(2).replace('.', ',')}`;

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  function handleOpenAdd() {
    newItem = {
      id: '',
      code: `INS-${String($inventoryStore.length + 1).padStart(3, '0')}`,
      name: '',
      category: 'INSUMO',
      currentQuantity: 10,
      unit: 'KG',
      minQuantity: 5,
      unitCostCents: 1000,
      supplier: 'Fornecedor Principal',
      lastRestockDate: new Date().toLocaleDateString('pt-BR'),
      status: 'NORMAL'
    };
    rawCostInput = '10,00';
    isAddModalOpen = true;
  }

  async function handleSaveNewItem() {
    if (!newItem.name.trim()) return;
    isSaving = true;
    const cleanCost = rawCostInput.replace(/[^\d,]/g, '').replace(',', '.');
    newItem.unitCostCents = Math.round(parseFloat(cleanCost) * 100) || 1000;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        await loadInventory();
        isAddModalOpen = false;
        feedbackToast = `✅ Insumo "${newItem.name}" salvo com sucesso!`;
        setTimeout(() => feedbackToast = '', 4000);
      } else {
        alert(resData.error || 'Erro ao salvar insumo.');
      }
    } catch (e: any) {
      alert(`Falha ao conectar com o servidor: ${e.message}`);
    } finally {
      isSaving = false;
    }
  }

  function promptDeleteItem(item: InventoryItem) {
    itemToDelete = item;
    isDeleteModalOpen = true;
  }

  async function confirmDeleteItem() {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`/api/inventory?id=${itemToDelete.id}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        inventoryStore.deleteItem(itemToDelete.id);
        feedbackToast = `🗑️ Insumo "${itemToDelete.name}" excluído com sucesso!`;
        setTimeout(() => feedbackToast = '', 4000);
        isDeleteModalOpen = false;
        itemToDelete = null;
        await loadInventory();
      } else {
        alert(resData.error || 'Erro ao excluir insumo.');
      }
    } catch (e: any) {
      alert(`Erro ao excluir insumo: ${e.message}`);
    }
  }

  async function handleUpdateQty(item: InventoryItem, delta: number) {
    const nextQty = Math.max(0, item.currentQuantity + delta);
    inventoryStore.updateQuantity(item.id, nextQty);

    try {
      await fetch('/api/inventory/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: item.id,
          quantity: Math.abs(delta),
          type: delta > 0 ? 'AJUSTE_MANUAL' : 'PERDA_AVARIA',
          reason: delta > 0 ? 'Ajuste manual de acréscimo (+1)' : 'Ajuste manual de redução (-1)'
        })
      });
    } catch (e) {
      console.warn('Erro ao sincronizar ajuste de saldo:', e);
    }
  }
</script>

<div class="space-y-6">
  {#if feedbackToast}
    <div class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-900 uppercase flex items-center gap-2">
      <Icon name="check" size={16} className="text-emerald-700" />
      <span>{feedbackToast}</span>
    </div>
  {/if}

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
      sublabel="Cadastrados no estoque"
      accent="default"
    />

    <MetricCard
      label="Alertas de Reposição"
      value={`${countCritico} Crítico | ${countBaixo} Baixo`}
      sublabel="Matérias-primas abaixo do estoque mínimo"
      accent={countCritico > 0 ? 'critical' : countBaixo > 0 ? 'amber' : 'default'}
    />

    <MetricCard
      label="Valor Estimado em Estoque"
      value={totalStockValueFormatted}
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
            <th class="px-3 py-2 text-right">Ajuste & Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if filteredInventory.length === 0}
            <tr>
              <td colspan="8" class="p-8 text-center text-slate-500 font-sans text-xs">
                Nenhum insumo cadastrado no estoque. Clique em "Novo Insumo" acima para cadastrar matérias-primas.
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
                <td class="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                  <button
                    type="button"
                    title="Diminuir saldo (-1)"
                    class="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-900 cursor-pointer text-xs"
                    on:click={() => handleUpdateQty(item, -1)}
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    title="Aumentar saldo (+1)"
                    class="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-900 cursor-pointer text-xs"
                    on:click={() => handleUpdateQty(item, +1)}
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    title="Deletar insumo"
                    class="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-300 font-bold text-red-700 cursor-pointer text-xs ml-1"
                    on:click={() => promptDeleteItem(item)}
                  >
                    <Icon name="trash" size={13} className="inline -mt-0.5" />
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
          <option value="G">Grama (G)</option>
          <option value="L">Litro (L)</option>
          <option value="ML">Mililitro (ML)</option>
          <option value="UN">Unidade (UN)</option>
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
    <PrimaryButton variant="primary" disabled={isSaving} on:click={handleSaveNewItem}>
      {isSaving ? 'Salvando...' : 'Salvar Insumo'}
    </PrimaryButton>
  </svelte:fragment>
</Modal>

<!-- Modal de Confirmação de Exclusão de Insumo -->
<Modal
  isOpen={isDeleteModalOpen}
  title="Confirmar Exclusão de Insumo"
  subtitle="Esta ação removerá o insumo do controle de estoque"
  maxWidth="sm"
  onClose={() => isDeleteModalOpen = false}
>
  <div class="p-2 space-y-2 font-mono text-xs text-slate-800">
    <p>Deseja realmente excluir o insumo <strong>"{itemToDelete?.name}"</strong> ({itemToDelete?.code})?</p>
    <p class="text-red-600 text-[11px] font-bold">⚠️ Esta operação removerá os registros de estoque associados.</p>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isDeleteModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="danger" on:click={confirmDeleteItem}>Sim, Excluir Insumo</PrimaryButton>
  </svelte:fragment>
</Modal>
