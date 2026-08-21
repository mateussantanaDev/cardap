<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' | 'accent' | 'amber' | 'wine' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let shortcut: string | undefined = undefined;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let label: string | undefined = undefined;
  export let fullWidth: boolean = false;
  export let href: string | undefined = undefined;

  let variantClasses = '';
  $: switch (variant) {
    case 'primary':
    case 'wine':
      variantClasses = 'bg-red-600 hover:bg-red-700 text-white border border-red-700 active:bg-red-800 focus:ring-2 focus:ring-red-600';
      break;
    case 'secondary':
      variantClasses = 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 active:bg-slate-200 focus:ring-2 focus:ring-red-600';
      break;
    case 'danger':
      variantClasses = 'bg-red-900 hover:bg-red-950 text-white border border-red-900 active:bg-red-950 focus:ring-2 focus:ring-red-600';
      break;
    case 'accent':
    case 'amber':
      variantClasses = 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-500 focus:ring-2 focus:ring-red-600';
      break;
  }

  let sizeClasses = '';
  $: switch (size) {
    case 'sm':
      sizeClasses = 'px-2.5 py-1 text-[11px] tracking-wider';
      break;
    case 'md':
      sizeClasses = 'px-3.5 py-2 text-xs tracking-wider font-semibold';
      break;
    case 'lg':
      sizeClasses = 'px-5 py-2.5 text-sm tracking-wider font-bold';
      break;
  }
</script>

{#if href}
  <a
    {href}
    class="inline-flex items-center justify-center gap-2 rounded-none uppercase font-mono transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none focus:outline-none {fullWidth ? 'w-full' : ''} {variantClasses} {sizeClasses} {$$props.class || ''}"
    on:click
  >
    {#if loading}
      <span class="h-3 w-3 animate-spin border-2 border-current border-t-transparent inline-block"></span>
    {/if}
    {#if label}
      <span>{label}</span>
    {:else}
      <slot />
    {/if}
    {#if shortcut}
      <kbd class="ml-1 px-1.5 py-0.5 text-[9px] font-mono border border-current/40 opacity-90 bg-black/10">
        {shortcut}
      </kbd>
    {/if}
  </a>
{:else}
  <button
    {type}
    disabled={disabled || loading}
    class="inline-flex items-center justify-center gap-2 rounded-none uppercase font-mono transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none focus:outline-none {fullWidth ? 'w-full' : ''} {variantClasses} {sizeClasses} {$$props.class || ''}"
    on:click
  >
    {#if loading}
      <span class="h-3 w-3 animate-spin border-2 border-current border-t-transparent inline-block"></span>
    {/if}
    {#if label}
      <span>{label}</span>
    {:else}
      <slot />
    {/if}
    {#if shortcut}
      <kbd class="ml-1 px-1.5 py-0.5 text-[9px] font-mono border border-current/40 opacity-90 bg-black/10">
        {shortcut}
      </kbd>
    {/if}
  </button>
{/if}
