<script lang="ts">
  export let status: string = '';
  export let prioridade: string = '';

  $: raw = (status || prioridade || '').toUpperCase().trim();

  $: toneClass = (() => {
    switch (raw) {
      case 'ABERTO':
      case 'APROVADO':
      case 'CONCLUIDO':
      case 'PRONTO':
      case 'ENTREGUE':
      case 'SESSAO_ATIVA':
        return 'border-emerald-700 bg-emerald-50 text-emerald-800';
      case 'AGUARDANDO':
      case 'EM_PREPARO':
      case 'PENDENCIA':
      case 'PRIORITARIA':
        return 'border-amber-600 bg-amber-50 text-amber-800';
      case 'URGENTE':
      case 'REJEITADO':
      case 'CANCELADO':
        return 'border-red-700 bg-red-50 text-red-800';
      case 'EMERGENCIA':
        return 'border-red-900 bg-red-800 text-white font-extrabold';
      case 'CONSUMO_LOCAL':
      case 'DELIVERY':
      case 'RASCUNHO':
      case 'ELETIVA':
      default:
        return 'border-slate-600 bg-slate-50 text-slate-700';
    }
  })();

  $: displayLabel = (() => {
    if (raw === 'CONSUMO_LOCAL') return '📍 CONSUMO LOCAL';
    if (raw === 'DELIVERY') return '🛵 DELIVERY';
    if (raw === 'EM_PREPARO') return '🥟 EM PREPARO';
    if (raw === 'PRONTO') return '✨ PRONTO';
    if (raw === 'ENTREGUE') return '🎉 ENTREGUE';
    if (raw === 'AGUARDANDO') return '⏱️ AGUARDANDO';
    return raw.replace(/_/g, ' ');
  })();
</script>

<span class="border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider inline-block uppercase {toneClass}">
  {displayLabel}
</span>
