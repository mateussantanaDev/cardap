<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let sublabel: string | undefined = undefined;
  export let trend: string | undefined = undefined;
  export let trendDirection: 'up' | 'down' | 'neutral' = 'up';
  export let accent: 'default' | 'warning' | 'critical' | 'success' | 'wine' | 'amber' = 'default';

  let borderAccentClass = '';
  $: switch (accent) {
    case 'default':
    case 'wine':
      borderAccentClass = 'border-l-red-600';
      break;
    case 'warning':
    case 'amber':
      borderAccentClass = 'border-l-amber-500';
      break;
    case 'success':
      borderAccentClass = 'border-l-emerald-600';
      break;
    case 'critical':
      borderAccentClass = 'border-l-red-700';
      break;
  }
</script>

<div
  class="bg-white border border-slate-200 border-l-4 {borderAccentClass} p-4 rounded-none flex flex-col justify-between"
>
  <div>
    <div class="flex items-center justify-between gap-2 mb-1">
      <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      {#if trend}
        <span
          class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-none {trendDirection === 'up'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            : trendDirection === 'down'
            ? 'bg-red-50 text-red-800 border border-red-300'
            : 'bg-slate-100 text-slate-700 border border-slate-300'}"
        >
          {trend}
        </span>
      {/if}
    </div>

    <!-- Valor numérico em font-mono -->
    <div class="font-mono text-2xl font-extrabold tracking-tight text-slate-900 my-1">
      {value}
    </div>
  </div>

  {#if sublabel}
    <div class="text-[11px] font-mono text-slate-500 mt-2 border-t border-slate-100 pt-2">
      {sublabel}
    </div>
  {/if}
</div>
