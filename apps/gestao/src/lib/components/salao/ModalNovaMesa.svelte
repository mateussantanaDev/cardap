<script lang="ts">
  import Modal from '$ui/Modal.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import { tableStore } from '$stores/tableStore';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};

  let tableNumber = 9;
  let capacity = 4;

  function handleCreate() {
    if (tableNumber <= 0) return;
    tableStore.addTable(Number(tableNumber), Number(capacity));
    onClose();
  }
</script>

<Modal
  {isOpen}
  title="Adicionar Nova Mesa ao Salão"
  subtitle="Configure a numeração e capacidade da mesa"
  maxWidth="sm"
  {onClose}
>
  <div class="space-y-4 font-mono text-xs">
    <FormField
      label="Número da Mesa:"
      name="tableNumber"
      type="number"
      bind:value={tableNumber}
      mono
      required
    />

    <FormField
      label="Capacidade (Pessoas):"
      name="capacity"
      type="number"
      bind:value={capacity}
      mono
      required
    />
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={onClose}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" shortcut="↵" on:click={handleCreate}>
      Cadastrar Mesa
    </PrimaryButton>
  </svelte:fragment>
</Modal>
