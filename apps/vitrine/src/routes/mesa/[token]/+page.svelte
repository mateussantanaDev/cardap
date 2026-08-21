<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PanelHeader from '$components/PanelHeader.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';

  import { tableSessionStore } from '$stores/tableSessionStore';

  export let data: any;

  onMount(() => {
    if (data.isValid && data.tableNumber) {
      tableSessionStore.setTableSession({
        tableNumber: data.tableNumber,
        tableId: data.tableId,
        token: data.token,
        restaurantSlug: data.restaurant?.slug
      });
    }
  });

  function handleOpenMenu() {
    const slug = data.restaurant?.slug || 'imperius-do-pastel';
    if (data.isValid && data.tableNumber) {
      tableSessionStore.setTableSession({
        tableNumber: data.tableNumber,
        tableId: data.tableId,
        token: data.token,
        restaurantSlug: slug
      });
    }
    goto(`/${slug}?token=${data.token}&table=${data.tableNumber}`);
  }
</script>

<div
  in:fly={{ y: 8, duration: 280, easing: cubicOut }}
  class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900 font-sans p-4"
>
  <!-- Header -->
  <header class="bg-slate-900 text-white p-4 space-y-1 border-b border-slate-800 backdrop-blur-md bg-slate-900/95 -mx-4 -mt-4 mb-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-mono text-xs font-bold tracking-widest uppercase text-white leading-tight">
          AUTOATENDIMENTO DIGITAL
        </h1>
        <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
          {data.restaurant?.name?.toUpperCase() || 'CARDAP ERP'} · SALÃO
        </span>
      </div>
      <span class="px-2 py-0.5 bg-amber-500 text-slate-950 font-mono text-[9px] font-bold uppercase">
        QR CODE SEGURO
      </span>
    </div>
  </header>

  <main class="space-y-6 flex-1 flex flex-col justify-center py-6">
    {#if data.isValid}
      <!-- Card da Mesa Validada -->
      <div class="border-2 border-slate-900 bg-white p-6 space-y-4 shadow-[8px_8px_0_rgba(15,23,42,0.15)] text-center">
        <div class="w-20 h-20 bg-amber-50 border-2 border-amber-500 mx-auto flex items-center justify-center text-amber-700 font-mono font-bold text-3xl">
          {data.tableNumber}
        </div>

        <div class="space-y-1">
          <span class="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
            MESA CONECTADA COM SUCESSO
          </span>
          <h2 class="font-mono text-2xl font-bold text-slate-900 uppercase">
            MESA {data.tableNumber}
          </h2>
          <p class="text-xs text-slate-600 font-sans max-w-sm mx-auto leading-relaxed pt-1">
            Seja bem-vindo ao {data.restaurant?.name}! Seus pedidos feitos por este dispositivo serão enviados diretamente para a cozinha e vinculados à sua comanda.
          </p>
        </div>

        <!-- Badges de Vantagens da Mesa -->
        <div class="border border-slate-200 bg-slate-50 p-3 flex items-center justify-around font-mono text-xs text-slate-800">
          <div class="flex items-center gap-1.5">
            <Icon name="check" size={14} className="text-emerald-600" />
            <span class="font-bold">Taxa Grátis</span>
          </div>
          <span class="text-slate-300">|</span>
          <div class="flex items-center gap-1.5">
            <Icon name="utensils" size={14} className="text-slate-600" />
            <span class="font-bold">KDS Salão</span>
          </div>
          <span class="text-slate-300">|</span>
          <div class="flex items-center gap-1.5">
            <Icon name="clock" size={14} className="text-slate-600" />
            <span class="font-bold">Preparo Rápido</span>
          </div>
        </div>

        <div class="pt-2">
          <PrimaryButton
            label={`FAZER PEDIDO NA MESA ${data.tableNumber} ➔`}
            variant="primary"
            shortcut="↵"
            fullWidth
            on:click={handleOpenMenu}
          />
        </div>
      </div>
    {:else}
      <!-- Alerta de QR Code Inválido ou Adulterado -->
      <div class="border-2 border-red-600 bg-white p-6 space-y-4 shadow-[8px_8px_0_rgba(220,38,38,0.15)] text-center">
        <div class="w-16 h-16 bg-red-100 border-2 border-red-600 mx-auto flex items-center justify-center text-red-600 text-3xl font-bold font-mono">
          ✕
        </div>

        <div class="space-y-1">
          <h2 class="font-mono text-lg font-bold text-red-600 uppercase">
            QR CODE INVÁLIDO OU EXPIRADO
          </h2>
          <p class="text-xs text-slate-600 font-sans max-w-sm mx-auto leading-relaxed">
            {data.errorMessage || 'A assinatura digital da mesa não pôde ser verificada. Por favor, escaneie novamente o QR Code da sua mesa.'}
          </p>
        </div>

        <div class="pt-2 space-y-2">
          <PrimaryButton
            label="VER CARDÁPIO GERAL (SEM MESA)"
            variant="secondary"
            fullWidth
            on:click={() => goto(`/${data.restaurant?.slug || 'imperius-do-pastel'}`)}
          />
        </div>
      </div>
    {/if}
  </main>

  <footer class="text-center font-mono text-[10px] text-slate-400 py-2 border-t border-slate-200">
    CARDAP ERP · SISTEMA DE AUTOATENDIMENTO EM SALÃO
  </footer>
</div>
