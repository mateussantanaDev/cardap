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
    onConfirm(cents, reasonInput || 'Sangria de segurança para cofre');
    amountInput = '';
    reasonInput = '';
    onClose();
  }
</script>

<Modal
  {isOpen}
  title="Realizar Sangria de Caixa (F3)"
  subtitle="Retirada de cédulas em excesso para depósito de segurança"
  maxWidth="md"
  {onClose}
>
  <div class="space-y-4 font-mono text-xs">
    <div class="p-3 bg-amber-50 border border-amber-300 text-amber-950 font-semibold">
      ⚠️ <strong>Atenção:</strong> Informe o valor exato retirado da gaveta física e a justificativa para auditoria.
    </div>

    <div>
      <FormField
        label="Valor da Sangria (R$):"
        name="sangriaAmount"
        bind:value={amountInput}
        placeholder="100,00"
        mono
        required
      />
    </div>

    <div>
      <FormField
        label="Motivo / Destino dos Valores:"
        name="sangriaReason"
        bind:value={reasonInput}
        placeholder="Ex: Transferência para cofre central"
        mono
      />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={onClose}>Cancelar</PrimaryButton>
    <PrimaryButton variant="danger" shortcut="F3" on:click={handleConfirm}>
      Confirmar Sangria
    </PrimaryButton>
  </svelte:fragment>
</Modal>
