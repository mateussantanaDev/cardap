<script lang="ts">
  export let status: string = '';
  export let prioridade: string | undefined = undefined;
  export let text: string | undefined = undefined;

  let badgeStyle = '';
  const key = prioridade || status;
  let labelText = text || key.replace(/_/g, ' ');

  $: switch (key.toUpperCase()) {
    case 'ENTREGUE':
    case 'PAGO':
    case 'CONCLUIDO':
    case 'MESA_LIVRE':
    case 'APROVADO':
      badgeStyle = 'border-emerald-600 bg-emerald-50 text-emerald-800';
      break;
    case 'EM_PREPARO':
    case 'MESA_OCUPADA':
    case 'ATENCAO':
    case 'PENDENTE':
    case 'AGUARDANDO_REGULACAO':
    case 'PENDENCIA_DOCUMENTO':
    case 'ELETIVA':
    case 'PRIORITARIA':
      badgeStyle = 'border-amber-500 bg-amber-50 text-amber-900';
      break;
    case 'ATRASADO':
    case 'CANCELADO':
    case 'CRITICO':
    case 'URGENTE':
    case 'EMERGENCIA':
    case 'REJEITADO':
    case 'ERRO':
      badgeStyle = 'border-red-600 bg-red-50 text-red-700';
      break;
    case 'RECEBIDO':
    case 'PRONTO':
    case 'SAIU_PARA_ENTREGA':
    case 'CONTA_SOLICITADA':
    case 'ATIVO':
      badgeStyle = 'border-red-600 bg-red-50 text-red-600';
      break;
    default:
      badgeStyle = 'border-slate-300 bg-slate-50 text-slate-700';
      break;
  }
</script>

<span
  class="inline-block rounded-none font-mono text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 border select-none {badgeStyle} {$$props.class || ''}"
>
  {labelText}
</span>
