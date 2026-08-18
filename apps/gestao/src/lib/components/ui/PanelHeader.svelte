<script lang="ts">
  export let title: string;
  export let subtitle: string | undefined = undefined;
  export let index: string | undefined = undefined;
</script>

<div class="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
  <div class="flex items-center gap-3">
    {#if index}
      <span class="bg-red-600 text-white font-mono text-xs font-bold px-2 py-0.5 select-none rounded-none">
        {index}
      </span>
    {/if}
    <div>
      <h2 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
        {title}
      </h2>
      {#if subtitle}
        <p class="text-[11px] font-sans text-slate-500 mt-0.5">
          {subtitle}
        </p>
      {/if}
    </div>
  </div>

  <div class="flex items-center gap-2">
    <slot />
  </div>
</div>
