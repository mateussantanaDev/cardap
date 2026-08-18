<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};
  export let title: string = '';
  export let subtitle: string = '';
  export let maxWidth: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  let backdropEl: HTMLDivElement;

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === backdropEl) {
      onClose();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }

  $: maxWidthClass = (() => {
    switch (maxWidth) {
      case 'sm': return 'max-w-sm';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      case 'md':
      default: return 'max-w-lg';
    }
  })();
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if isOpen}
  <!-- Backdrop Animado -->
  <div
    bind:this={backdropEl}
    transition:fade={{ duration: 180 }}
    role="presentation"
    class="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
    on:click={handleBackdropClick}
  >
    <!-- Modal Box Com Transição Fluida Apple-Level (70% Base Surface White + 20% Structure Slate-900) -->
    <div
      in:fly={{ y: 16, duration: 240, easing: cubicOut }}
      out:fade={{ duration: 140 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      class="bg-white border-2 border-slate-900 w-full {maxWidthClass} shadow-[8px_8px_0_rgba(15,23,42,0.2)] max-h-[90vh] flex flex-col justify-between overflow-hidden text-slate-900"
    >
      <!-- Header -->
      <div class="border-b border-slate-200 bg-slate-100 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          {#if title}
            <h3 id="modal-title" class="font-mono text-xs font-bold tracking-widest uppercase text-slate-900">
              {title}
            </h3>
          {/if}
          {#if subtitle}
            <p class="text-[11px] text-slate-500 font-sans leading-tight mt-0.5">{subtitle}</p>
          {/if}
        </div>

        <button
          type="button"
          aria-label="Fechar modal"
          on:click={onClose}
          class="w-7 h-7 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 border border-slate-300 font-mono font-bold text-xs flex items-center justify-center cursor-pointer transition-all duration-150"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 overflow-y-auto flex-1 text-slate-800 space-y-4">
        <slot />
      </div>

      <!-- Optional Footer Slot -->
      {#if $$slots.footer}
        <div class="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-end gap-2">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
