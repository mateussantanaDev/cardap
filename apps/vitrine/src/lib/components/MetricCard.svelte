<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let sublabel: string = '';
  export let trend: string = '';
  export let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
  export let accent: 'default' | 'warning' | 'critical' | 'success' = 'default';

  $: accentClass = (() => {
    switch (accent) {
      case 'warning': return 'border-l-4 border-amber-600';
      case 'critical': return 'border-l-4 border-red-700';
      case 'success': return 'border-l-4 border-emerald-700';
      case 'default':
      default: return 'border-l-4 border-blue-900';
    }
  })();

  $: trendColor = (() => {
    switch (trendDirection) {
      case 'up': return 'text-emerald-700';
      case 'down': return 'text-red-700';
      case 'neutral':
      default: return 'text-slate-500';
    }
  })();
</script>

<div class="border border-slate-200 bg-white p-3.5 space-y-1 {accentClass}">
  <div class="flex items-center justify-between">
    <span class="text-[10px] font-semibold tracking-widest uppercase text-slate-500 block truncate">
      {label}
    </span>
    {#if trend}
      <span class="font-mono text-[10px] font-bold {trendColor}">
        {trend}
      </span>
    {/if}
  </div>

  <div class="font-mono text-2xl font-bold tracking-tight text-slate-900">
    {value}
  </div>

  {#if sublabel}
    <p class="text-[11px] text-slate-500 font-sans leading-none pt-0.5 truncate">
      {sublabel}
    </p>
  {/if}
</div>
