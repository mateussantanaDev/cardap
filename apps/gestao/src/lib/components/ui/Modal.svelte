<script lang="ts">
  import Icon from '$components/Icon.svelte';

  export let isOpen: boolean = false;
  export let title: string;
  export let subtitle: string | undefined = undefined;
  export let maxWidth: 'sm' | 'md' | 'lg' | 'xl' = 'lg';
  export let onClose: () => void = () => {};

  let maxWidthClass = 'max-w-lg';
  $: switch (maxWidth) {
    case 'sm': maxWidthClass = 'max-w-sm'; break;
    case 'md': maxWidthClass = 'max-w-md'; break;
    case 'lg': maxWidthClass = 'max-w-lg'; break;
    case 'xl': maxWidthClass = 'max-w-xl'; break;
  }
</script>

{#if isOpen}
  <!-- Backdrop com frosted glass sutil -->
  <div class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" on:click|self={onClose}>
    <div
      class="bg-white border-2 border-slate-900 shadow-none {maxWidthClass} w-full rounded-none flex flex-col justify-between overflow-hidden"
    >
      <!-- Header do Modal -->
      <div class="bg-white p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            {title}
          </h3>
          {#if subtitle}
            <p class="font-sans text-[11px] text-slate-500 mt-0.5">
              {subtitle}
            </p>
          {/if}
        </div>
        <button
          on:click={onClose}
          class="font-mono text-xs text-slate-500 hover:text-slate-900 px-2 py-1 flex items-center gap-1 cursor-pointer"
        >
          <kbd class="px-1.5 py-0.5 text-[9px] font-mono border border-slate-300 bg-slate-100 text-slate-700">ESC</kbd>
        </button>
      </div>

      <!-- Conteúdo Interno -->
      <div class="p-5 font-sans text-xs text-slate-700 space-y-4 max-h-[75vh] overflow-y-auto">
        <slot />
      </div>

      <!-- Rodapé do Modal -->
      {#if $$slots.footer}
        <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
