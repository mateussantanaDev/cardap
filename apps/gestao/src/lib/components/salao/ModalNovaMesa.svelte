<script lang="ts">
  import Modal from '$ui/Modal.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import { tableStore } from '$stores/tableStore';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};
  export let onCreated: () => void = () => {};

  let tableNumber = 1;
  let capacity = 4;
  let isSaving = false;
  let errorMessage = '';

  async function handleCreate() {
    if (tableNumber <= 0) {
      errorMessage = 'O número da mesa deve ser maior que 0.';
      return;
    }
    errorMessage = '';
    isSaving = true;

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: tableNumber, capacity })
      });

      const resData = await res.json();
      if (res.ok && resData.success && resData.table) {
        tableStore.addTableObject(resData.table);
        onCreated();
        onClose();
      } else {
        errorMessage = resData.error || 'Erro ao cadastrar mesa.';
      }
    } catch (e: any) {
      errorMessage = 'Falha de conexão com o servidor: ' + e.message;
    } finally {
      isSaving = false;
    }
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
    {#if errorMessage}
      <div class="p-2.5 bg-red-50 border border-red-300 text-red-700 font-bold text-[11px]">
        ⚠️ {errorMessage}
      </div>
    {/if}

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
    <PrimaryButton variant="secondary" disabled={isSaving} on:click={onClose}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" shortcut="↵" disabled={isSaving} on:click={handleCreate}>
      {#if isSaving}Salvando...{:else}Cadastrar Mesa{/if}
    </PrimaryButton>
  </svelte:fragment>
</Modal>
