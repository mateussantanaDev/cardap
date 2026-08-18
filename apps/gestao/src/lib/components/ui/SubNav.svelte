<script lang="ts">
  export let items: Array<{
    id: string;
    label: string;
    count?: number;
    shortcut?: string;
    badgeTone?: 'default' | 'warning' | 'critical' | 'success';
  }> = [];
  export let activeId: string;
  export let onSelect: (id: string) => void = () => {};
</script>

<div class="flex items-center gap-1 border-b border-slate-200 bg-slate-100 px-4 pt-2 overflow-x-auto">
  {#each items as item}
    {@const isActive = activeId === item.id}
    <button
      class="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors border-t-2 -mb-px rounded-none cursor-pointer flex items-center gap-2 {isActive ? 'border-red-600 text-slate-900 bg-white font-extrabold' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
      on:click={() => onSelect(item.id)}
    >
      <span>{item.label}</span>

      {#if item.shortcut}
        <kbd class="px-1 py-0.2 text-[9px] font-mono border border-slate-300 bg-slate-100 text-slate-500">
          {item.shortcut}
        </kbd>
      {/if}

      {#if item.count !== undefined}
        <span
          class="px-1.5 py-0.2 text-[10px] font-mono font-bold {item.badgeTone === 'critical'
            ? 'bg-red-700 text-white'
            : item.badgeTone === 'warning'
            ? 'bg-amber-600 text-white'
            : item.badgeTone === 'success'
            ? 'bg-emerald-700 text-white'
            : isActive
            ? 'bg-red-600 text-white'
            : 'bg-slate-200 text-slate-700'}"
        >
          {item.count}
        </span>
      {/if}
    </button>
  {/each}
</div>
