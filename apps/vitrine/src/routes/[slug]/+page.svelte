<script lang="ts">
  import '../../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';
  import ProductCardItem from '$components/ProductCardItem.svelte';
  import ProductOptionsModal from '$components/ProductOptionsModal.svelte';
  import CartDrawerModal from '$components/CartDrawerModal.svelte';
  import PanelHeader from '$components/PanelHeader.svelte';
  import SubNav from '$components/SubNav.svelte';
  import FormField from '$components/FormField.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import StoreHeaderInfo from '$components/StoreHeaderInfo.svelte';
  import PromoCarousel from '$components/PromoCarousel.svelte';
  import BottomBarNav from '$components/BottomBarNav.svelte';
  import { cartStore, cartItemCount, cartSubtotalFormatted } from '$stores/cartStore';

  import { onMount } from 'svelte';

  export let data: any;

  $: slug = data?.slug || $page.params.slug || 'imperius-do-pastel';
  $: tenant = data?.restaurant || tenantVitrineManager.getTenant(slug);
  $: if (slug) {
    tenantVitrineManager.setSlug(slug);
  }

  let searchQuery = '';
  let selectedCategory = '';
  let activeProductModal: any = null;
  let isModalOpen = false;
  let isCartDrawerOpen = false;

  let liveCategories: any[] = data?.categories || [];
  let liveProducts: any[] = data?.products || [];

  async function loadLiveCatalog() {
    try {
      const res = await fetch('/api/catalog?channel=B2C');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.categories) {
          const cats: any[] = [];
          const prods: any[] = [];
          for (const c of data.categories) {
            cats.push({ id: c.slug.toUpperCase(), label: c.name });
            for (const p of c.products || []) {
              const rawPrice = p.priceCents !== undefined
                ? Number(p.priceCents)
                : (p.basePriceCents !== undefined ? Number(p.basePriceCents) : Math.round(Number(p.price || 0) * 100));
              const finalPrice = isNaN(rawPrice) ? 0 : rawPrice;

              prods.push({
                id: p.id,
                code: p.code || 'PAST',
                category: c.slug.toUpperCase(),
                name: p.name,
                description: p.description || '',
                basePriceCents: finalPrice,
                isCustomizable: Boolean(p.isAssembly),
                imageUrl: p.imageUrl,
                assemblyGroups: p.assemblyGroups || []
              });
            }
          }
          if (cats.length > 0) liveCategories = cats;
          if (prods.length > 0) liveProducts = prods;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar catálogo ao vivo:', e);
    }
  }

  onMount(() => {
    loadLiveCatalog();
  });

  $: categories = liveCategories.length > 0 ? liveCategories : tenant.categories;
  $: if (!selectedCategory && categories.length > 0) {
    selectedCategory = categories[0].id;
  }

  $: categoryTabs = categories.map((c, i) => ({
    id: c.id,
    label: c.label,
    active: selectedCategory === c.id,
    shortcut: String(i + 1)
  }));

  $: currentProductList = liveProducts.length > 0 ? liveProducts : tenant.products;
  $: filteredCatalog = currentProductList.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
  });

  function handleSelectProduct(product: any) {
    if (product.isCustomizable || (product.assemblyGroups && product.assemblyGroups.length > 0)) {
      activeProductModal = product;
      isModalOpen = true;
    } else {
      cartStore.addItem({
        productId: product.id,
        productName: product.name,
        basePriceCents: product.basePriceCents,
        quantity: 1,
        selectedAssemblies: [],
        selectedModifiers: [],
        selectedComplements: []
      });
    }
  }

  function handleCategorySelect(e: CustomEvent<string>) {
    selectedCategory = e.detail;
    const el = document.getElementById(`cat-section-${e.detail}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleSelectPromo(e: CustomEvent<any>) {
    const promo = e.detail;
    if (promo.targetCategory) {
      selectedCategory = promo.targetCategory;
      const el = document.getElementById(`cat-section-${promo.targetCategory}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<!-- Shell Mobile-First Multi-Tenant -->
<div
  in:fly={{ y: 8, duration: 280, easing: cubicOut }}
  class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative pb-16 text-slate-900 font-sans"
>
  <!-- Header Institucional do Tenant -->
  <StoreHeaderInfo
    storeName={tenant.name}
    storeCategory={tenant.category}
    rating={tenant.rating}
    operatingHoursToday={tenant.operatingHours}
    slaText={tenant.slaText}
    deliveryFeeText={tenant.deliveryFeeText}
    minOrderText={tenant.minOrderText}
    isOpen={tenant.isOpen}
  />

  <!-- Banner de Destaques & Promoções -->
  <div class="p-3 bg-slate-100 border-b border-slate-200">
    <PromoCarousel on:selectPromo={handleSelectPromo} />
  </div>

  <!-- Campo de Busca Sticky -->
  <div class="p-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
    <FormField
      label=""
      name="search"
      type="text"
      bind:value={searchQuery}
      placeholder={`Buscar no cardápio de ${tenant.name}...`}
      mono
    />
  </div>

  <!-- Barra Horizontal de Categorias (SubNav Sticky) -->
  {#if categoryTabs.length > 0}
    <div class="sticky top-[58px] z-20">
      <SubNav tabs={categoryTabs} on:select={handleCategorySelect} />
    </div>
  {/if}

  <!-- Lista de Seções por Categoria -->
  <main class="p-4 space-y-6 flex-1 pb-28">
    {#each categories as cat}
      {@const catItems = filteredCatalog.filter(p => p.category === cat.id)}

      {#if catItems.length > 0}
        <div id={`cat-section-${cat.id}`} class="border border-slate-200 bg-white shadow-xs">
          <PanelHeader
            title={cat.label}
            subtitle={`${catItems.length} opção(ões) no cardápio`}
            index="01"
          >
            <span class="font-mono text-[10px] font-bold text-red-600 uppercase">
              {catItems.length} ITENS
            </span>
          </PanelHeader>

          <div class="divide-y divide-slate-100">
            {#each catItems as product (product.id)}
              <ProductCardItem {product} onSelectProduct={handleSelectProduct} />
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </main>

  <!-- Elemento Flutuante da Sacola -->
  {#if $cartItemCount > 0}
    <div
      in:fly={{ y: 16, duration: 250, easing: cubicOut }}
      out:fade={{ duration: 150 }}
      class="fixed bottom-14 left-0 right-0 max-w-2xl mx-auto px-4 z-40 pointer-events-none"
    >
      <div class="pointer-events-auto bg-white border-2 border-slate-900 p-3 flex items-center justify-between gap-3 shadow-[8px_8px_0_rgba(15,23,42,0.18)] text-slate-900">
        <button
          type="button"
          on:click={() => isCartDrawerOpen = true}
          class="flex items-center gap-3 text-left cursor-pointer hover:opacity-90 active:scale-98 transition-all duration-150"
        >
          <span class="bg-red-600 text-white font-mono font-bold text-xs px-2 py-1">
            {$cartItemCount} {$cartItemCount === 1 ? 'ITEM' : 'ITENS'}
          </span>
          <div>
            <span class="text-[10px] font-semibold tracking-widest uppercase text-slate-500 block">
              VER MINHA SACOLA ↗
            </span>
            <span class="font-mono text-sm font-bold text-red-600">
              {$cartSubtotalFormatted}
            </span>
          </div>
        </button>

        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={() => isCartDrawerOpen = true}
            class="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-mono text-xs font-bold uppercase transition-all duration-150 cursor-pointer border border-slate-300"
          >
            SACOLA
          </button>
          <PrimaryButton
            label="FINALIZAR"
            variant="primary"
            shortcut="↵"
            on:click={() => goto('/checkout')}
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- Fixed Bottom Bar Navigation -->
  <div class="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50">
    <BottomBarNav
      activeTab="cardapio"
      cartCount={$cartItemCount}
    />
  </div>
</div>

<!-- Modal Opções / Adicionais -->
{#if isModalOpen && activeProductModal}
  <ProductOptionsModal
    isOpen={isModalOpen}
    product={activeProductModal}
    onClose={() => isModalOpen = false}
  />
{/if}

<!-- Drawer / Sheet Interativo da Sacola de Compras -->
{#if isCartDrawerOpen}
  <CartDrawerModal
    isOpen={isCartDrawerOpen}
    onClose={() => isCartDrawerOpen = false}
  />
{/if}
