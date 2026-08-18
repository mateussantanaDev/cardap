<script lang="ts">
  import Modal from '$ui/Modal.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};
  export let onConfirm: (amountCents: number, reason: string) => void = () => {};

  let amountInput = '';
  let reasonInput = '';

  function parseInputValue(str: string): number {
    if (!str) return 0;
    const clean = str.replace(/[^\d,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.round(val * 100);
  }

  function handleConfirm() {
    const cents = parseInputValue(amountInput);
    if (cents <= 0) return;
    onConfirm(cents, reasonInput || 'Aporte / Suprimento de troco inicial');
    amountInput = '';
    reasonInput = '';
    onClose();
  }
</script>

<Modal
  {isOpen}
  title="Aporte / Suprimento de Caixa (F4)"
  subtitle="Entrada de troco em moedas ou cédulas na gaveta"
  maxWidth="md"
  {onClose}
>
  <div class="space-y-4 font-mono text-xs">
    <div class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 font-semibold">
      ℹ️ <strong>Suprimento:</strong> Registre a entrada de dinheiro para troco operacional.
    </div>

    <div>
      <FormField
        label="Valor do Aporte / Troco (R$):"
        name="suprimentoAmount"
        bind:value={amountInput}
        placeholder="50,00"
        mono
        required
      />
    </div>

    <div>
      <FormField
        label="Origem / Justificativa:"
        name="suprimentoReason"
        bind:value={reasonInput}
        placeholder="Ex: Reforço de troco em moedas de R$ 0,50"
        mono
      />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={onClose}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" shortcut="F4" on:click={handleConfirm}>
      Confirmar Aporte
    </PrimaryButton>
  </svelte:fragment>
</Modal>
