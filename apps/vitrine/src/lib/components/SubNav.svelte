<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let tabs: Array<{
    id: string;
    label: string;
    href?: string;
    active?: boolean;
    shortcut?: string;
    badge?: string | number;
    badgeTone?: 'default' | 'warning' | 'critical' | 'success';
  }> = [];

  const dispatch = createEventDispatcher();

  function handleSelect(tabId: string) {
    dispatch('select', tabId);
  }

  function getBadgeToneClass(tone: string = 'default') {
    switch (tone) {
      case 'warning': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'critical': return 'bg-red-100 text-red-900 border-red-300';
      case 'success': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'default':
      default: return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  }
</script>

<nav class="bg-slate-100 border-b border-slate-200 flex overflow-x-auto">
  {#each tabs as tab}
    <button
      type="button"
      on:click={() => handleSelect(tab.id)}
      class="px-4 py-2.5 font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 border-r border-slate-200 cursor-pointer focus:outline-none {tab.active ? 'bg-white text-red-600 font-bold border-t-2 border-t-red-600 border-b-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-b border-slate-200'}"
    >
      <span>{tab.label}</span>

      {#if tab.badge !== undefined && tab.badge !== ''}
        <span class="px-1.5 py-0.5 font-mono text-[9px] font-bold border leading-none {getBadgeToneClass(tab.badgeTone)}">
          {tab.badge}
        </span>
      {/if}

      {#if tab.shortcut}
        <kbd class="px-1 py-0.5 font-mono text-[9px] border border-current opacity-60 leading-none">
          {tab.shortcut}
        </kbd>
      {/if}
    </button>
  {/each}
</nav>
