<script lang="ts">
  import { catalogManager, type ManagedProduct, type ManagedCoupon, type ProductAssemblyGroup } from '$stores/catalogManagementStore';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import SubNav from '$ui/SubNav.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Modal from '$ui/Modal.svelte';
  import Icon from '$components/Icon.svelte';

  import { onMount } from 'svelte';

  const { storeConfig, categories, products, coupons, operatingHours } = catalogManager;

  export let data: any = {};

  let activeTab: 'produtos' | 'categorias' | 'cupons' | 'loja' = 'produtos';

  $: if (data?.categories && data.categories.length > 0) {
    const catList: any[] = [];
    const prodList: any[] = [];
    for (const cat of data.categories) {
      catList.push({
        id: cat.id,
        name: cat.name.toUpperCase(),
        itemCount: (cat.products || []).length,
        isActive: cat.isActive !== false
      });
      for (const p of cat.products || []) {
        prodList.push({
          id: p.id,
          code: p.code || 'PROD',
          category: cat.name.toUpperCase(),
          name: p.name,
          description: p.description || '',
          basePriceCents: p.basePriceCents,
          isCustomizable: Boolean(p.isCustomizable),
          isActive: p.isActive !== false,
          imageUrl: p.imageUrl,
          assemblyGroups: p.assemblyGroups || []
        });
      }
    }
    categories.set(catList);
    products.set(prodList);
  }

  $: if (data?.coupons && data.coupons.length > 0) {
    coupons.set(data.coupons);
  }

  async function loadCatalog() {
    try {
      const res = await fetch('/api/catalog?channel=B2B');
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.categories) {
          const catList: any[] = [];
          const prodList: any[] = [];
          for (const cat of resData.categories) {
            catList.push({
              id: cat.id,
              name: cat.name.toUpperCase(),
              itemCount: (cat.products || []).length,
              isActive: cat.isActive !== false
            });
            for (const p of cat.products || []) {
              prodList.push({
                id: p.id,
                code: p.code || 'PROD',
                category: cat.name.toUpperCase(),
                name: p.name,
                description: p.description || '',
                basePriceCents: p.priceCents !== undefined ? Number(p.priceCents) : Math.round(Number(p.price || 0) * 100),
                isCustomizable: Boolean(p.isAssembly),
                isActive: p.isActive !== false,
                imageUrl: p.imageUrl,
                assemblyGroups: p.assemblyGroups || []
              });
            }
          }
          if (catList.length > 0) categories.set(catList);
          if (prodList.length > 0) products.set(prodList);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar cardápio:', e);
    }
  }

  onMount(() => {
    loadCatalog();
  });

  // Modal Produto State
  let isProductModalOpen = false;
  let editingProduct: ManagedProduct = {
    id: '',
    code: '',
    category: 'TRADICIONAIS',
    name: '',
    description: '',
    basePriceCents: 0,
    isCustomizable: false,
    isActive: true,
    assemblyGroups: []
  };
  let rawPriceInput = '';

  // Modal Cupom State
  let isCouponModalOpen = false;
  let editingCoupon: ManagedCoupon = {
    id: '',
    code: '',
    discountType: 'FIXED',
    discountValue: 1000,
    discountLabel: 'R$ 10,00 OFF',
    description: '',
    minOrderCents: 3000,
    expiryText: 'Validade: 30 dias',
    isActive: true
  };
  let rawCouponValueInput = '';
  let rawMinOrderInput = '';

  // Nova Categoria Input
  let newCategoryName = '';
  let feedbackToast = '';

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  function parseInputValue(str: string): number {
    if (!str) return 0;
    const normalized = str.trim().replace(',', '.');
    const clean = normalized.replace(/[^\d.]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.round(val * 100);
  }

  function handleImageFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result;
        if (typeof result === 'string') {
          editingProduct.imageUrl = result;
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function handleCouponBannerFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result;
        if (typeof result === 'string') {
          editingCoupon.bannerImageUrl = result;
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function handleOpenNewProduct() {
    editingProduct = {
      id: `p-${Date.now()}`,
      code: `PROD-0${$products.length + 1}`,
      category: $categories[0]?.name || 'TRADICIONAIS',
      name: '',
      description: '',
      basePriceCents: 1500,
      isCustomizable: false,
      isActive: true,
      assemblyGroups: []
    };
    rawPriceInput = '15,00';
    isProductModalOpen = true;
  }

  function handleEditProduct(prod: ManagedProduct) {
    editingProduct = JSON.parse(JSON.stringify(prod));
    const cents = prod.basePriceCents || 0;
    rawPriceInput = (cents / 100).toFixed(2).replace('.', ',');
    isProductModalOpen = true;
  }

  async function handleSaveProduct() {
    if (!editingProduct.name.trim()) return;
    const newPriceCents = parseInputValue(rawPriceInput);
    editingProduct.basePriceCents = newPriceCents;
    catalogManager.saveProduct(editingProduct);
    isProductModalOpen = false;

    try {
      feedbackToast = `Sincronizando "${editingProduct.name}"...`;
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          code: editingProduct.code,
          name: editingProduct.name,
          categoryName: editingProduct.category,
          description: editingProduct.description,
          basePriceCents: newPriceCents,
          isAssembly: editingProduct.isCustomizable,
          isActive: editingProduct.isActive !== false
        })
      });
      if (res.ok) {
        feedbackToast = `✓ Produto "${editingProduct.name}" atualizado para ${fmt(newPriceCents)} no ERP e na Vitrine!`;
        setTimeout(() => feedbackToast = '', 4000);
      }
      await loadCatalog();
    } catch (e) {
      console.error('Erro ao sincronizar produto com PostgreSQL:', e);
      feedbackToast = 'Erro ao sincronizar com banco.';
    }
  }

  async function handleToggleProductActive(prodId: string) {
    catalogManager.toggleProductActive(prodId);
    const prod = $products.find(p => p.id === prodId);
    if (prod) {
      try {
        await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: prod.id,
            code: prod.code,
            name: prod.name,
            categoryName: prod.category,
            description: prod.description,
            basePriceCents: prod.basePriceCents,
            isAssembly: prod.isCustomizable,
            isActive: prod.isActive !== false
          })
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function handleDeleteProduct(prodId: string) {
    catalogManager.deleteProduct(prodId);
    try {
      await fetch(`/api/catalog?id=${prodId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }

  function handleOpenNewCoupon() {
    editingCoupon = {
      id: `c-${Date.now()}`,
      code: '',
      discountType: 'FIXED',
      discountValue: 1000,
      discountLabel: 'R$ 10,00 OFF',
      description: '',
      minOrderCents: 4000,
      expiryText: 'Validade: 31/12/2026',
      isActive: true
    };
    rawCouponValueInput = '10,00';
    rawMinOrderInput = '40,00';
    isCouponModalOpen = true;
  }

  function handleEditCoupon(coupon: ManagedCoupon) {
    editingCoupon = JSON.parse(JSON.stringify(coupon));
    rawCouponValueInput = (coupon.discountValue / 100).toFixed(2).replace('.', ',');
    rawMinOrderInput = (coupon.minOrderCents / 100).toFixed(2).replace('.', ',');
    isCouponModalOpen = true;
  }

  function handleSaveCoupon() {
    if (!editingCoupon.code.trim()) return;
    if (editingCoupon.discountType === 'FIXED') {
      editingCoupon.discountValue = parseInputValue(rawCouponValueInput);
      editingCoupon.discountLabel = `R$ ${(editingCoupon.discountValue / 100).toFixed(2).replace('.', ',')} OFF`;
    } else if (editingCoupon.discountType === 'PERCENTAGE') {
      editingCoupon.discountLabel = `${editingCoupon.discountValue}% OFF`;
    } else {
      editingCoupon.discountLabel = 'ENTREGA GRÁTIS';
    }
    editingCoupon.minOrderCents = parseInputValue(rawMinOrderInput);
    catalogManager.saveCoupon(editingCoupon);
    isCouponModalOpen = false;
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    catalogManager.addCategory(newCategoryName);
    newCategoryName = '';
  }

  // Grupos de adicionais do produto
  function addAssemblyGroup() {
    if (!editingProduct.assemblyGroups) editingProduct.assemblyGroups = [];
    editingProduct.assemblyGroups = [
      ...editingProduct.assemblyGroups,
      {
        id: `g-${Date.now()}`,
        name: `Novo Grupo (${editingProduct.assemblyGroups.length + 1})`,
        minChoices: 1,
        maxChoices: 1,
        isRequired: true,
        options: [
          { id: `opt-${Date.now()}-1`, name: 'Opção Padrão', priceAdjustmentCents: 0 }
        ]
      }
    ];
    editingProduct.isCustomizable = true;
  }

  function addAssemblyOption(groupIndex: number) {
    if (!editingProduct.assemblyGroups) return;
    editingProduct.assemblyGroups[groupIndex].options.push({
      id: `opt-${Date.now()}`,
      name: 'Novo Adicional',
      priceAdjustmentCents: 200
    });
    editingProduct.assemblyGroups = [...editingProduct.assemblyGroups];
  }
  function handleTabSelect(id: string) {
    activeTab = id as 'produtos' | 'categorias' | 'cupons' | 'loja';
  }
</script>

<div class="space-y-6">
  <!-- PanelHeader Principal da Central de Gestão do Cardápio -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Central de Gestão do Cardápio & Loja"
      subtitle="Gerencie produtos, adicionais, categorias, cupons de desconto, taxas e horários da vitrine"
      index="06"
    >
      <div class="flex items-center gap-2">
        <StatusBadge status={$storeConfig.status} text={`LOJA ${$storeConfig.status}`} />
        <PrimaryButton
          variant={$storeConfig.status === 'ABERTO' ? 'secondary' : 'primary'}
          size="sm"
          on:click={() => catalogManager.toggleStoreStatus($storeConfig.status === 'ABERTO' ? 'FECHADO' : 'ABERTO')}
        >
          {$storeConfig.status === 'ABERTO' ? 'Fechar Loja' : 'Abrir Loja'}
        </PrimaryButton>
      </div>
    </PanelHeader>

    {#if feedbackToast}
      <div class="px-4 py-2.5 bg-emerald-50 border-b border-emerald-300 text-emerald-950 font-mono text-xs font-bold flex items-center gap-2">
        <span class="w-2 h-2 bg-emerald-600 animate-ping inline-block"></span>
        <span>{feedbackToast}</span>
      </div>
    {/if}

    <!-- SubNav com Abas de Gestão (Atalhos <kbd> 1, 2, 3, 4) -->
    <SubNav
      items={[
        { id: 'produtos', label: '1. Produtos & Itens', shortcut: '1', count: $products.length },
        { id: 'categorias', label: '2. Categorias', shortcut: '2', count: $categories.length },
        { id: 'cupons', label: '3. Cupons & Promoções', shortcut: '3', count: $coupons.length },
        { id: 'loja', label: '4. Dados da Loja & Taxas', shortcut: '4' }
      ]}
      activeId={activeTab}
      onSelect={handleTabSelect}
    />
  </div>

  <!-- ==================== ABA 1: PRODUTOS & ITENS ==================== -->
  {#if activeTab === 'produtos'}
    <div class="space-y-4">
      <div class="flex items-center justify-between bg-white p-4 border border-slate-200">
        <div>
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            Catálogo de Produtos Cadastrados
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            Gerencie preços, adicionais, fotos vetoriais e ativação de itens exibidos na Vitrine.
          </p>
        </div>

        <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenNewProduct}>
          <Icon name="plus" size={14} className="mr-1" />
          Novo Produto
        </PrimaryButton>
      </div>

      <!-- Tabela de Produtos -->
      <div class="bg-white border border-slate-200">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                <th class="border-r border-slate-200 px-3 py-2">Código</th>
                <th class="border-r border-slate-200 px-3 py-2">Produto / Item</th>
                <th class="border-r border-slate-200 px-3 py-2">Categoria</th>
                <th class="border-r border-slate-200 px-3 py-2">Preço Base</th>
                <th class="border-r border-slate-200 px-3 py-2">Montagem / Adicionais</th>
                <th class="border-r border-slate-200 px-3 py-2">Status</th>
                <th class="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each $products as p}
                <tr class="hover:bg-slate-50 transition-colors {!p.isActive ? 'opacity-60 bg-slate-50/80' : ''}">
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-red-600">{p.code}</td>
                  <td class="border-r border-slate-100 px-3 py-2.5">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 bg-slate-100 border border-slate-300 shrink-0 flex items-center justify-center text-slate-700 overflow-hidden">
                        {#if p.imageUrl}
                          <img src={p.imageUrl} alt={p.name} class="w-full h-full object-cover" />
                        {:else}
                          <Icon name="burger" size={16} />
                        {/if}
                      </div>
                      <div>
                        <div class="font-bold text-slate-900 font-sans">{p.name}</div>
                        <div class="text-[11px] text-slate-500 font-sans line-clamp-1">{p.description}</div>
                      </div>
                    </div>
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-700">
                    <span class="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px]">
                      {p.category}
                    </span>
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900">{fmt(p.basePriceCents)}</td>
                  <td class="border-r border-slate-100 px-3 py-2.5">
                    {#if p.isCustomizable && p.assemblyGroups && p.assemblyGroups.length > 0}
                      <span class="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold">
                        {p.assemblyGroups.length} Grupo(s)
                      </span>
                    {:else}
                      <span class="text-slate-400 text-[10px]">Simples</span>
                    {/if}
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2.5">
                    <button
                      type="button"
                      class="px-2 py-0.5 text-[10px] font-bold uppercase border rounded-none cursor-pointer transition-colors {p.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700 border-slate-400'}"
                      on:click={() => handleToggleProductActive(p.id)}
                    >
                      {p.isActive ? 'ATIVO NA VITRINE' : 'PAUSADO'}
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-right space-x-1">
                    <PrimaryButton size="sm" variant="secondary" on:click={() => handleEditProduct(p)}>
                      Editar
                    </PrimaryButton>
                    <PrimaryButton size="sm" variant="danger" on:click={() => handleDeleteProduct(p.id)}>
                      Excluir
                    </PrimaryButton>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}

  <!-- ==================== ABA 2: CATEGORIAS ==================== -->
  {#if activeTab === 'categorias'}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2 bg-white border border-slate-200 p-4 space-y-4">
        <div class="border-b border-slate-200 pb-3">
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            Categorias do Cardápio Digital
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            As categorias organizam os itens no cabeçalho e menu de navegação da Vitrine.
          </p>
        </div>

        <div class="divide-y divide-slate-100 font-mono text-xs">
          {#each $categories as cat}
            <div class="py-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700">
                  ≡
                </span>
                <div>
                  <span class="font-bold text-slate-900 text-sm uppercase">{cat.name}</span>
                  <span class="block text-[10px] text-slate-500 font-sans">
                    {$products.filter(p => p.category === cat.name).length} produto(s) vinculado(s)
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-2 py-0.5 text-[10px] font-bold uppercase border rounded-none cursor-pointer {cat.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700 border-slate-400'}"
                  on:click={() => catalogManager.toggleCategoryActive(cat.id)}
                >
                  {cat.isActive ? 'EXIBIDA NA VITRINE' : 'OCULTA'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Nova Categoria Form -->
      <div class="bg-white border border-slate-200 p-4 space-y-4 h-fit">
        <div class="border-b border-slate-200 pb-2">
          <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            Adicionar Categoria
          </h4>
        </div>

        <div>
          <FormField
            label="Nome da Categoria:"
            name="newCategoryName"
            bind:value={newCategoryName}
            placeholder="Ex: PORÇÕES / SOBREMESAS"
            mono
          />
        </div>

        <PrimaryButton variant="primary" fullWidth on:click={handleAddCategory}>
          <Icon name="plus" size={14} className="mr-1" />
          Cadastrar Categoria
        </PrimaryButton>
      </div>
    </div>
  {/if}

  <!-- ==================== ABA 3: CUPONS & PROMOÇÕES ==================== -->
  {#if activeTab === 'cupons'}
    <div class="space-y-4">
      <div class="flex items-center justify-between bg-white p-4 border border-slate-200">
        <div>
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            Cupons & Vouchers Promocionais
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            Gerencie códigos de desconto exibidos na aba de Cupons do aplicativo do cliente.
          </p>
        </div>

        <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenNewCoupon}>
          <Icon name="plus" size={14} className="mr-1" />
          Novo Cupom
        </PrimaryButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each $coupons as c}
          <div class="bg-white border border-slate-200 p-4 space-y-3 font-mono text-xs flex flex-col justify-between">
            <div class="space-y-2">
              {#if c.bannerImageUrl}
                <div class="w-full h-28 bg-slate-100 border border-slate-300 overflow-hidden mb-2">
                  <img src={c.bannerImageUrl} alt={c.code} class="w-full h-full object-cover" />
                </div>
              {/if}

              <div class="flex items-center justify-between">
                <span class="font-bold text-white bg-red-600 border border-red-700 px-2.5 py-1 text-sm uppercase">
                  {c.code}
                </span>
                <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5">
                  {c.discountLabel}
                </span>
              </div>

              <p class="text-xs text-slate-700 font-sans leading-normal">
                {c.description}
              </p>

              <div class="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                Mínimo: <strong>{fmt(c.minOrderCents)}</strong> · {c.expiryText}
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                class="px-2 py-0.5 text-[10px] font-bold uppercase border cursor-pointer {c.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700 border-slate-400'}"
                on:click={() => catalogManager.toggleCouponActive(c.id)}
              >
                {c.isActive ? 'ATIVO' : 'PAUSADO'}
              </button>

              <div class="space-x-1">
                <PrimaryButton size="sm" variant="secondary" on:click={() => handleEditCoupon(c)}>
                  Editar
                </PrimaryButton>
                <PrimaryButton size="sm" variant="danger" on:click={() => catalogManager.deleteCoupon(c.id)}>
                  Excluir
                </PrimaryButton>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ==================== ABA 4: DADOS DA LOJA & TAXAS ==================== -->
  {#if activeTab === 'loja'}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Formulário de Configuração Geral da Loja -->
      <div class="lg:col-span-2 bg-white border border-slate-200 p-5 space-y-4">
        <div class="border-b border-slate-200 pb-3">
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            Dados Institucionais do Estabelecimento
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            Essas informações são exibidas no cabeçalho e na rota <code>/loja</code> da Vitrine.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Nome Fantasia da Loja:"
            name="storeName"
            bind:value={$storeConfig.name}
            mono
            required
          />

          <FormField
            label="Subtítulo / Cidade:"
            name="storeSubtitle"
            bind:value={$storeConfig.subtitle}
            mono
          />

          <FormField
            label="Razão Social:"
            name="razaoSocial"
            bind:value={$storeConfig.razaoSocial}
            mono
          />

          <FormField
            label="CNPJ:"
            name="cnpj"
            bind:value={$storeConfig.cnpj}
            mono
          />

          <FormField
            label="Telefone / WhatsApp Comercial:"
            name="phone"
            bind:value={$storeConfig.phone}
            mono
          />

          <FormField
            label="Endereço Completo da Loja:"
            name="address"
            bind:value={$storeConfig.address}
            mono
          />
        </div>

        <div class="border-t border-slate-200 pt-4">
          <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 mb-3">
            Regras de Delivery & Taxas
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label for="deliveryFeeInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                Taxa de Entrega (R$):
              </label>
              <input
                id="deliveryFeeInput"
                type="number"
                step="0.50"
                value={$storeConfig.deliveryFeeCents / 100}
                on:change={(e) => catalogManager.updateStoreConfig({ deliveryFeeCents: Math.round(parseFloat(e.currentTarget.value) * 100) })}
                class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 rounded-none"
              />
            </div>

            <div>
              <label for="minOrderInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                Pedido Mínimo (R$):
              </label>
              <input
                id="minOrderInput"
                type="number"
                step="1.00"
                value={$storeConfig.minOrderCents / 100}
                on:change={(e) => catalogManager.updateStoreConfig({ minOrderCents: Math.round(parseFloat(e.currentTarget.value) * 100) })}
                class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 rounded-none"
              />
            </div>

            <div>
              <label for="slaMinInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                SLA de Entrega (Minutos):
              </label>
              <div class="flex items-center gap-2 font-mono text-xs">
                <input
                  id="slaMinInput"
                  type="number"
                  bind:value={$storeConfig.slaMinutesMin}
                  class="w-full p-2 bg-white border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-none"
                />
                <span>a</span>
                <input
                  type="number"
                  bind:value={$storeConfig.slaMinutesMax}
                  class="w-full p-2 bg-white border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="pt-3 flex justify-end">
          <PrimaryButton variant="primary" shortcut="Ctrl+S">
            Salvar Configurações da Loja
          </PrimaryButton>
        </div>
      </div>

      <!-- Grade Semanal de Horários & Modos de Pagamento -->
      <div class="space-y-6">
        <!-- Grade Semanal -->
        <div class="bg-white border border-slate-200 p-4 space-y-3">
          <div class="border-b border-slate-200 pb-2">
            <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
              Grade Semanal de Horários
            </h4>
          </div>

          <div class="divide-y divide-slate-100 font-mono text-xs">
            {#each $operatingHours as h}
              <div class="py-2 flex items-center justify-between gap-2">
                <span class="font-bold text-slate-900 w-10">{h.day}</span>
                <input
                  type="text"
                  bind:value={h.time}
                  class="p-1 bg-slate-50 border border-slate-300 text-[11px] font-mono w-32 focus:outline-none focus:border-red-600 rounded-none"
                />
                <button
                  type="button"
                  class="px-2 py-0.5 text-[9px] font-bold uppercase border cursor-pointer {h.isOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'}"
                  on:click={() => catalogManager.toggleDayOpen(h.day)}
                >
                  {h.isOpen ? 'ABERTO' : 'FECHADO'}
                </button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Formas de Pagamento Aceitas -->
        <div class="bg-white border border-slate-200 p-4 space-y-3 font-mono text-xs">
          <div class="border-b border-slate-200 pb-2">
            <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
              Formas de Pagamento Aceitas
            </h4>
          </div>

          <div class="space-y-2">
            <label class="flex items-center justify-between p-2 border border-slate-200 bg-slate-50 cursor-pointer">
              <span>Dinheiro na Entrega</span>
              <input type="checkbox" bind:checked={$storeConfig.paymentMethods.dinheiro} class="accent-red-600 w-4 h-4" />
            </label>

            <label class="flex items-center justify-between p-2 border border-slate-200 bg-slate-50 cursor-pointer">
              <span>Pagamento PIX Instantâneo</span>
              <input type="checkbox" bind:checked={$storeConfig.paymentMethods.pix} class="accent-red-600 w-4 h-4" />
            </label>

            <label class="flex items-center justify-between p-2 border border-slate-200 bg-slate-50 cursor-pointer">
              <span>Cartão de Crédito (Maquineta)</span>
              <input type="checkbox" bind:checked={$storeConfig.paymentMethods.cartaoCredito} class="accent-red-600 w-4 h-4" />
            </label>

            <label class="flex items-center justify-between p-2 border border-slate-200 bg-slate-50 cursor-pointer">
              <span>Cartão de Débito (Maquineta)</span>
              <input type="checkbox" bind:checked={$storeConfig.paymentMethods.cartaoDebito} class="accent-red-600 w-4 h-4" />
            </label>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- ==================== MODAL DE PRODUTO ==================== -->
<Modal
  isOpen={isProductModalOpen}
  title={editingProduct.id ? `Editar Produto: ${editingProduct.code}` : 'Novo Produto do Cardápio'}
  subtitle="Configure preço, grupo de adicionais e disponibilidade"
  maxWidth="xl"
  onClose={() => isProductModalOpen = false}
>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <FormField label="Código (SKU):" name="pCode" bind:value={editingProduct.code} mono required />
      <div>
        <label for="pCategorySelect" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Categoria:</label>
        <select
          id="pCategorySelect"
          bind:value={editingProduct.category}
          class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          {#each $categories as cat}
            <option value={cat.name}>{cat.name}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Anexo de Imagem do Produto -->
    <div class="border border-slate-200 bg-slate-50 p-3 space-y-2 font-mono text-xs">
      <span class="block text-[10px] font-bold uppercase tracking-widest text-slate-700">
        IMAGEM DO PRODUTO (VITRINE & PDV):
      </span>

      <div class="flex items-start gap-4">
        <div class="w-20 h-20 bg-white border border-slate-300 shrink-0 flex items-center justify-center relative overflow-hidden">
          {#if editingProduct.imageUrl}
            <img src={editingProduct.imageUrl} alt={editingProduct.name} class="w-full h-full object-cover" />
            <button
              type="button"
              class="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-1"
              on:click={() => editingProduct.imageUrl = ''}
            >
              ✕
            </button>
          {:else}
            <Icon name="burger" size={32} className="text-slate-400" />
          {/if}
        </div>

        <div class="flex-1 space-y-2">
          <label class="block cursor-pointer">
            <span class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider inline-block rounded-none">
              📁 Upload de Imagem Local
            </span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              on:change={handleImageFileChange}
            />
          </label>

          <FormField
            label="ou cole a URL da Imagem:"
            name="pImgUrl"
            bind:value={editingProduct.imageUrl}
            placeholder="https://exemplo.com/foto.jpg"
            mono
          />
        </div>
      </div>
    </div>

    <FormField label="Nome do Produto:" name="pName" bind:value={editingProduct.name} required />
    <FormField label="Descrição Comercial:" name="pDesc" bind:value={editingProduct.description} placeholder="Ingredientes e detalhes..." />

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="pRawPrice" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Preço Base (R$):</label>
        <input
          id="pRawPrice"
          type="text"
          bind:value={rawPriceInput}
          placeholder="0,00"
          class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      <div class="flex items-center pt-5">
        <label class="flex items-center gap-2 cursor-pointer font-mono text-xs font-bold">
          <input type="checkbox" bind:checked={editingProduct.isCustomizable} class="accent-red-600 w-4 h-4" />
          <span>Possui Adicionais / Personalização</span>
        </label>
      </div>
    </div>

    <!-- Se for personalizável, gerenciar grupos de adicionais -->
    {#if editingProduct.isCustomizable}
      <div class="border-t border-slate-200 pt-3 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-mono text-xs font-bold uppercase text-slate-900">Grupos de Adicionais & Escolhas</h4>
          <PrimaryButton size="sm" variant="secondary" on:click={addAssemblyGroup}>
            + Adicionar Grupo
          </PrimaryButton>
        </div>

        {#if editingProduct.assemblyGroups && editingProduct.assemblyGroups.length > 0}
          {#each editingProduct.assemblyGroups as group, gIdx}
            <div class="bg-slate-50 p-3 border border-slate-300 space-y-2 font-mono text-xs">
              <div class="flex items-center justify-between gap-2">
                <input
                  type="text"
                  bind:value={group.name}
                  placeholder="Nome do grupo (ex: Escolha a Massa)"
                  class="font-bold p-1 bg-white border border-slate-300 text-xs w-full rounded-none"
                />
                <label class="flex items-center gap-1 text-[10px] shrink-0">
                  <input type="checkbox" bind:checked={group.isRequired} class="accent-red-600" />
                  <span>Obrigatório</span>
                </label>
              </div>

              <!-- Lista de Adicionais do Grupo -->
              <div class="space-y-1.5 pl-2 border-l-2 border-slate-300">
                {#each group.options as opt}
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      bind:value={opt.name}
                      placeholder="Nome do adicional"
                      class="p-1 bg-white border border-slate-200 text-xs flex-1 rounded-none"
                    />
                    <div class="w-24">
                      <input
                        type="number"
                        step="0.50"
                        value={opt.priceAdjustmentCents / 100}
                        on:change={(e) => opt.priceAdjustmentCents = Math.round(parseFloat(e.currentTarget.value) * 100)}
                        class="p-1 bg-white border border-slate-200 text-xs w-full text-right font-bold rounded-none"
                      />
                    </div>
                  </div>
                {/each}
                <button
                  type="button"
                  on:click={() => addAssemblyOption(gIdx)}
                  class="text-[10px] font-bold text-red-600 hover:underline pt-1 cursor-pointer"
                >
                  + Opção de Adicional
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isProductModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveProduct}>Salvar Produto</PrimaryButton>
  </svelte:fragment>
</Modal>

<!-- ==================== MODAL DE CUPOM ==================== -->
<Modal
  isOpen={isCouponModalOpen}
  title={editingCoupon.id ? `Editar Cupom: ${editingCoupon.code}` : 'Novo Cupom Promocional'}
  subtitle="Configure o valor de desconto, pedido mínimo e regras"
  maxWidth="md"
  onClose={() => isCouponModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <FormField label="Código Promocional (Cupom):" name="cCode" bind:value={editingCoupon.code} placeholder="EX: BURGUER15" mono required />

    <div>
      <label for="discountTypeSelect" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Tipo de Desconto:</label>
      <select
        id="discountTypeSelect"
        bind:value={editingCoupon.discountType}
        class="w-full p-2 bg-white border border-slate-300 font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <option value="FIXED">Valor Fixo em Reais (R$ OFF)</option>
        <option value="PERCENTAGE">Percentual (% OFF)</option>
        <option value="FREE_DELIVERY">Entrega Grátis</option>
      </select>
    </div>

    {#if editingCoupon.discountType === 'FIXED'}
      <div>
        <label for="couponValInput" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Valor do Desconto (R$):</label>
        <input
          id="couponValInput"
          type="text"
          bind:value={rawCouponValueInput}
          placeholder="10,00"
          class="w-full p-2 bg-white border border-slate-300 font-bold rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>
    {:else if editingCoupon.discountType === 'PERCENTAGE'}
      <div>
        <label for="couponPctInput" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Porcentagem de Desconto (%):</label>
        <input
          id="couponPctInput"
          type="number"
          bind:value={editingCoupon.discountValue}
          placeholder="15"
          class="w-full p-2 bg-white border border-slate-300 font-bold rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>
    {/if}

    <div>
      <label for="minOrderCouponInput" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Pedido Mínimo (R$):</label>
      <input
        id="minOrderCouponInput"
        type="text"
        bind:value={rawMinOrderInput}
        placeholder="40,00"
        class="w-full p-2 bg-white border border-slate-300 font-bold rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
      />
    </div>

    <FormField label="Descrição Comercial:" name="cDesc" bind:value={editingCoupon.description} placeholder="Regras do cupom..." />
    <FormField label="Texto de Validade:" name="cExpiry" bind:value={editingCoupon.expiryText} placeholder="Validade: 31/12/2026" mono />

    <!-- Anexo de Banner / Imagem do Carrossel de Promoções -->
    <div class="border border-slate-200 bg-slate-50 p-3 space-y-2 font-mono text-xs">
      <span class="block text-[10px] font-bold uppercase tracking-widest text-slate-700">
        BANNER DA PROMOÇÃO (CARROSSEL DA VITRINE):
      </span>

      <div class="flex items-start gap-4">
        <div class="w-24 h-16 bg-white border border-slate-300 shrink-0 flex items-center justify-center relative overflow-hidden">
          {#if editingCoupon.bannerImageUrl}
            <img src={editingCoupon.bannerImageUrl} alt={editingCoupon.code} class="w-full h-full object-cover" />
            <button
              type="button"
              class="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-1"
              on:click={() => editingCoupon.bannerImageUrl = ''}
            >
              ✕
            </button>
          {:else}
            <Icon name="store" size={24} className="text-slate-400" />
          {/if}
        </div>

        <div class="flex-1 space-y-2">
          <label class="block cursor-pointer">
            <span class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider inline-block rounded-none">
              📁 Upload Imagem do Banner
            </span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              on:change={handleCouponBannerFileChange}
            />
          </label>

          <FormField
            label="ou URL do Banner:"
            name="cBannerUrl"
            bind:value={editingCoupon.bannerImageUrl}
            placeholder="https://exemplo.com/banner-promocao.jpg"
            mono
          />
        </div>
      </div>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isCouponModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveCoupon}>Salvar Cupom</PrimaryButton>
  </svelte:fragment>
</Modal>
