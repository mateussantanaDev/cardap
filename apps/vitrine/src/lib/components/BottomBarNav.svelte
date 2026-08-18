<script lang="ts">
  import { goto } from '$app/navigation';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';
  import Icon from './Icon.svelte';

  export let activeTab: 'cardapio' | 'cupons' | 'pedidos' | 'conta' = 'cardapio';
  export let cartCount: number = 0;

  const { currentSlug } = tenantVitrineManager;

  function handleNavigate(tab: 'cardapio' | 'cupons' | 'pedidos' | 'conta') {
    const slug = $currentSlug || 'imperius-do-pastel';

    if (tab === 'cardapio') {
      goto(`/${slug}`);
    } else if (tab === 'cupons') {
      goto('/cupons');
    } else if (tab === 'pedidos') {
      goto('/pedidos');
    } else if (tab === 'conta') {
      goto('/conta');
    }
  }
</script>

<nav class="bg-white text-slate-700 border-t-2 border-slate-200 flex justify-around items-center p-1 font-mono text-[10px] z-30 shadow-2xl">
  <!-- Cardápio do Restaurante Ativo -->
  <button
    type="button"
    on:click={() => handleNavigate('cardapio')}
    class="flex-1 py-1.5 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out cursor-pointer active:scale-95 {activeTab === 'cardapio' ? 'text-red-600 font-bold bg-slate-100 border-t-2 border-red-600' : 'hover:text-slate-900 hover:bg-slate-50'}"
  >
    <Icon name="utensils" size={18} />
    <span class="uppercase tracking-widest">Cardápio</span>
  </button>

  <!-- Cupons -->
  <button
    type="button"
    on:click={() => handleNavigate('cupons')}
    class="flex-1 py-1.5 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out cursor-pointer relative active:scale-95 {activeTab === 'cupons' ? 'text-red-600 font-bold bg-slate-100 border-t-2 border-red-600' : 'hover:text-slate-900 hover:bg-slate-50'}"
  >
    <Icon name="coupon" size={18} />
    <span class="uppercase tracking-widest">Cupons</span>
  </button>

  <!-- Pedidos / Sacola -->
  <button
    type="button"
    on:click={() => handleNavigate('pedidos')}
    class="flex-1 py-1.5 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out cursor-pointer relative active:scale-95 {activeTab === 'pedidos' ? 'text-red-600 font-bold bg-slate-100 border-t-2 border-red-600' : 'hover:text-slate-900 hover:bg-slate-50'}"
  >
    <Icon name="orders" size={18} />
    <span class="uppercase tracking-widest">Pedidos</span>
    {#if cartCount > 0}
      <span class="absolute top-1 right-3 px-1 py-0.5 bg-red-600 text-white text-[9px] font-bold leading-none animate-pulse">
        {cartCount}
      </span>
    {/if}
  </button>

  <!-- Conta / Perfil -->
  <button
    type="button"
    on:click={() => handleNavigate('conta')}
    class="flex-1 py-1.5 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out cursor-pointer active:scale-95 {activeTab === 'conta' ? 'text-red-600 font-bold bg-slate-100 border-t-2 border-red-600' : 'hover:text-slate-900 hover:bg-slate-50'}"
  >
    <Icon name="user" size={18} />
    <span class="uppercase tracking-widest">Conta</span>
  </button>
</nav>
