<script lang="ts">
  export let titulo: string;
  export let descricao: string = '';
  export let state: 'COMPLETED' | 'ACTIVE' | 'PENDING' = 'PENDING';
  export let isLast: boolean = false;
  export let icon: string = '•';

  $: nodeClass = (() => {
    switch (state) {
      case 'COMPLETED':
        return 'bg-emerald-600 text-white border-emerald-700';
      case 'ACTIVE':
        return 'bg-red-600 text-white border-red-700 ring-2 ring-red-600/30';
      case 'PENDING':
      default:
        return 'bg-slate-100 text-slate-500 border-slate-300';
    }
  })();
</script>

<li class="relative pl-7 pb-6 last:pb-0 list-none">
  {#if !isLast}
    <div
      aria-hidden="true"
      class="absolute left-2.5 top-6 bottom-0 w-0.5 {state === 'COMPLETED' ? 'bg-emerald-600' : 'bg-slate-200'}"
    ></div>
  {/if}

  <!-- Dot node -->
  <div
    class="absolute left-0 top-0.5 w-5 h-5 border font-mono text-[10px] font-bold flex items-center justify-center {nodeClass}"
  >
    {#if state === 'COMPLETED'}
      ✓
    {:else}
      {icon}
    {/if}
  </div>

  <div class="border border-slate-200 bg-white p-3 space-y-0.5 text-slate-900">
    <div class="flex items-center justify-between">
      <h4 class="font-mono text-xs font-bold uppercase tracking-wider {state === 'ACTIVE' ? 'text-red-600' : state === 'COMPLETED' ? 'text-slate-900' : 'text-slate-500'}">
        {titulo}
      </h4>

      {#if state === 'ACTIVE'}
        <span class="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-300 font-mono text-[9px] font-bold uppercase tracking-wider animate-pulse">
          Em andamento
        </span>
      {:else if state === 'COMPLETED'}
        <span class="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-bold uppercase tracking-wider">
          Concluído
        </span>
      {/if}
    </div>

    {#if descricao}
      <p class="text-xs text-slate-600 font-sans leading-relaxed">
        {descricao}
      </p>
    {/if}
  </div>
</li>
