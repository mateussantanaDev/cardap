<script lang="ts">
  export let title: string;
  export let subtitle: string = '';
  export let index: string = '';
</script>

<div class="border-b border-slate-200 bg-slate-100/90 px-4 py-3 flex items-center justify-between gap-3">
  <div class="flex items-center gap-3 min-w-0">
    {#if index}
      <!-- 10% Accent Index Chip -->
      <span class="bg-red-600 text-white font-mono font-bold text-xs px-2 py-0.5 border border-red-700 shrink-0">
        {index}
      </span>
    {/if}
    <div class="min-w-0">
      <h3 class="font-mono text-xs font-bold tracking-widest uppercase text-slate-900 truncate">
        {title}
      </h3>
      {#if subtitle}
        <p class="text-[11px] text-slate-500 font-sans leading-tight truncate mt-0.5">{subtitle}</p>
      {/if}
    </div>
  </div>
  <slot />
</div>
