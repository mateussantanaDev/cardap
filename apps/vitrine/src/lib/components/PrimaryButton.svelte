<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label: string = '';
  export let variant: 'primary' | 'secondary' | 'danger' | 'accent' = 'primary';
  export let loading: boolean = false;
  export let disabled: boolean = false;
  export let shortcut: string = '';
  export let fullWidth: boolean = false;
  export let type: 'button' | 'submit' = 'button';

  const dispatch = createEventDispatcher();

  function handleClick(e: MouseEvent) {
    if (disabled || loading) return;
    dispatch('click', e);
  }

  $: variantClasses = (() => {
    switch (variant) {
      case 'secondary':
        return 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 active:bg-slate-200';
      case 'danger':
        return 'bg-red-900 hover:bg-red-950 text-white border border-red-900 active:bg-black';
      case 'accent':
        return 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-500 active:bg-amber-700';
      case 'primary':
      default:
        // 10% Brand Accent Focal Color (Red-600)
        return 'bg-red-600 hover:bg-red-700 text-white border border-red-700 active:bg-red-800';
    }
  })();
</script>

<button
  {type}
  disabled={disabled || loading}
  on:click={handleClick}
  class="px-4 py-2.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-600 {fullWidth ? 'w-full' : ''} {variantClasses}"
>
  {#if loading}
    <span class="h-3 w-3 animate-spin border-2 border-current border-t-transparent inline-block"></span>
  {/if}

  <span>
    {#if label}{label}{:else}<slot />{/if}
  </span>

  {#if shortcut}
    <kbd class="ml-1.5 px-1 py-0.5 font-mono text-[9px] border border-current opacity-70 inline-block leading-none">
      {shortcut}
    </kbd>
  {/if}
</button>
