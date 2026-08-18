<script lang="ts">
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Icon from '$components/Icon.svelte';

  export let isOpen: boolean = false;
  export let expectedCashCents: number = 135000;
  export let onClose: () => void = () => {};

  let step: 'INPUT' | 'AUDIT_RESULT' = 'INPUT';

  let cashInput = '';
  let cardInput = '';
  let pixInput = '';
  let notesInput = '';

  let auditResult: {
    expectedFormatted: string;
    actualFormatted: string;
    differenceFormatted: string;
    differenceCents: number;
    hasQuebra: boolean;
  } | null = null;

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  function parseInputValue(str: string): number {
    if (!str) return 0;
    const clean = str.replace(/[^\d,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.round(val * 100);
  }

  function handleCalculateClosure() {
    const cashCents = parseInputValue(cashInput);
    const cardCents = parseInputValue(cardInput);
    const pixCents = parseInputValue(pixInput);

    const actualTotalCents = cashCents + cardCents + pixCents;
    const diffCents = actualTotalCents - expectedCashCents;

    auditResult = {
      expectedFormatted: fmt(expectedCashCents),
      actualFormatted: fmt(actualTotalCents),
      differenceFormatted: fmt(Math.abs(diffCents)),
      differenceCents: diffCents,
      hasQuebra: diffCents < 0
    };

    step = 'AUDIT_RESULT';
  }

  function handleResetModal() {
    step = 'INPUT';
    cashInput = '';
    cardInput = '';
    pixInput = '';
    notesInput = '';
    auditResult = null;
    onClose();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" on:click|self={handleResetModal}>
    <div class="bg-white border-2 border-slate-900 max-w-lg w-full p-6 rounded-none space-y-4 shadow-none">
      
      <!-- Header do Modal -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            FECHAMENTO CEGO DE CAIXA
          </h3>
          <p class="font-sans text-[11px] text-slate-500 mt-0.5">
            {step === 'INPUT' ? 'Informe os valores físicos contados na gaveta' : 'Relatório de Auditoria Financeira do Turno'}
          </p>
        </div>
        <button on:click={handleResetModal} class="text-slate-400 hover:text-slate-900 font-mono text-xs font-bold px-2 py-1 cursor-pointer">
          <kbd class="px-1.5 py-0.5 text-[9px] font-mono border border-slate-300 bg-slate-100 text-slate-700">ESC</kbd>
        </button>
      </div>

      {#if step === 'INPUT'}
        <!-- Etapa 1: Digitação Cega dos Valores -->
        <div class="space-y-4 font-mono text-xs">
          <div class="p-3 bg-amber-50 border border-amber-300 text-amber-950 font-semibold flex items-center gap-2">
            <Icon name="lock" size={16} className="text-amber-700 shrink-0" />
            <span><strong>Regra Cega:</strong> Por segurança, os saldos esperados pelo sistema estão ocultos até a confirmação da contagem física.</span>
          </div>

          <div>
            <label for="cashInput" class="block text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-1">
              Dinheiro Físico em Cédulas e Moedas (R$)
            </label>
            <input
              id="cashInput"
              type="text"
              bind:value={cashInput}
              placeholder="0,00"
              class="w-full p-2 bg-slate-50 border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600 focus:outline-none rounded-none"
            />
          </div>

          <div>
            <label for="cardInput" class="block text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-1">
              Comprovantes de Cartão (Crédito + Débito R$)
            </label>
            <input
              id="cardInput"
              type="text"
              bind:value={cardInput}
              placeholder="0,00"
              class="w-full p-2 bg-slate-50 border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600 focus:outline-none rounded-none"
            />
          </div>

          <div>
            <label for="pixInput" class="block text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-1">
              Transferências PIX Confirmadas (R$)
            </label>
            <input
              id="pixInput"
              type="text"
              bind:value={pixInput}
              placeholder="0,00"
              class="w-full p-2 bg-slate-50 border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600 focus:outline-none rounded-none"
            />
          </div>

          <div>
            <label for="notesInput" class="block text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-1">
              Observações ou Justificativas do Operador
            </label>
            <textarea
              id="notesInput"
              bind:value={notesInput}
              rows="2"
              placeholder="Ex: Sobrou R$ 2,00 por conta de troco dispensado pelo cliente"
              class="w-full p-2 bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600 focus:outline-none rounded-none"
            ></textarea>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <PrimaryButton variant="secondary" on:click={handleResetModal}>
            Cancelar
          </PrimaryButton>
          <PrimaryButton variant="danger" shortcut="F9" on:click={handleCalculateClosure}>
            Encerrar & Auditar Turno
          </PrimaryButton>
        </div>

      {:else if auditResult}
        <!-- Etapa 2: Resultado da Auditoria Cega -->
        <div class="space-y-4 font-mono text-xs">
          <div class="p-3 border {auditResult.differenceCents === 0 ? 'bg-emerald-50 border-emerald-700 text-emerald-950' : auditResult.hasQuebra ? 'bg-red-50 border-red-700 text-red-950' : 'bg-amber-50 border-amber-600 text-amber-950'}">
            <div class="flex items-center justify-between font-bold text-xs mb-1">
              <span>RESULTADO DA AUDITORIA</span>
              <StatusBadge status={auditResult.differenceCents === 0 ? 'CONCLUIDO' : auditResult.hasQuebra ? 'ATRASADO' : 'ATENCAO'} text={auditResult.differenceCents === 0 ? 'CAIXA PERFEITO' : auditResult.hasQuebra ? 'QUEBRA DE CAIXA' : 'SOBRA DE CAIXA'} />
            </div>
            <p class="font-sans text-xs">
              {auditResult.differenceCents === 0
                ? 'Nenhuma divergência encontrada. O valor contado confere com o sistema.'
                : auditResult.hasQuebra
                ? `Quebra de caixa detectada! Falta de ${auditResult.differenceFormatted} na gaveta.`
                : `Sobra de caixa detectada! Excesso de ${auditResult.differenceFormatted} na gaveta.`}
            </p>
          </div>

          <div class="space-y-2 bg-slate-50 p-3 border border-slate-200">
            <div class="flex justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500 uppercase">Esperado pelo Sistema:</span>
              <span class="font-bold text-slate-900">{auditResult.expectedFormatted}</span>
            </div>

            <div class="flex justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500 uppercase">Informado pelo Operador:</span>
              <span class="font-bold text-slate-900">{auditResult.actualFormatted}</span>
            </div>

            <div class="flex justify-between py-1 font-bold text-xs">
              <span class="uppercase">Diferença / Divergência:</span>
              <span class={auditResult.differenceCents === 0 ? 'text-emerald-700' : auditResult.hasQuebra ? 'text-red-700' : 'text-amber-700'}>
                {auditResult.differenceFormatted}
              </span>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-200 flex justify-end">
          <PrimaryButton variant="primary" on:click={handleResetModal}>
            <Icon name="printer" size={14} className="mr-1" />
            Imprimir Comprovante & Concluir
          </PrimaryButton>
        </div>
      {/if}

    </div>
  </div>
{/if}
