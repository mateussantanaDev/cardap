<script lang="ts">
  import Modal from '$ui/Modal.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';

  export let isOpen: boolean = false;
  export let table: {
    id: string;
    number: number;
    capacity: number;
    signedQrToken?: string;
    qrCodeUrl?: string;
  } | null = null;

  export let restaurant: {
    name: string;
    logoUrl?: string;
    primaryColor?: string;
  } | null = null;

  export let onClose: () => void = () => {};

  function handlePrint() {
    window.print();
  }
</script>

{#if isOpen && table}
  <Modal
    {isOpen}
    title={`Placa QR Code — Mesa ${table.number < 10 ? `0${table.number}` : table.number}`}
    subtitle="Identificação criptográfica anti-fraude para pedidos presenciais no salão"
    maxWidth="md"
    {onClose}
  >
    <div class="space-y-4">
      <!-- Placa Visual Pronta para Impressão -->
      <div
        id="printable-table-card"
        class="border-4 border-slate-900 bg-white p-6 text-center space-y-4 shadow-md font-mono max-w-xs mx-auto"
      >
        <!-- Topo da Placa com Logo e Nome -->
        <div class="space-y-1 border-b-2 border-slate-900 pb-3">
          {#if restaurant?.logoUrl}
            <img src={restaurant.logoUrl} alt="Logo" class="w-12 h-12 mx-auto object-contain mb-1" />
          {/if}
          <h3 class="font-extrabold text-sm uppercase tracking-wider text-slate-900">
            {restaurant?.name || 'CARDAP FOOD'}
          </h3>
          <span class="text-[10px] text-slate-500 font-bold uppercase block tracking-widest">
            ATENDIMENTO DIGITAL
          </span>
        </div>

        <!-- Destaque do Número da Mesa -->
        <div class="py-2 bg-slate-900 text-white">
          <span class="text-xs uppercase tracking-widest text-slate-400 block">Número da Mesa</span>
          <div class="text-3xl font-black tracking-widest text-white">
            MESA {table.number < 10 ? `0${table.number}` : table.number}
          </div>
        </div>

        <!-- Imagem do QR Code em Alta Resolução -->
        <div class="p-2 border-2 border-dashed border-slate-300 bg-white inline-block">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(table.qrCodeUrl || '')}&size=260x260&margin=2`}
            alt={`QR Code Mesa ${table.number}`}
            class="w-48 h-48 mx-auto"
          />
        </div>

        <!-- Instruções ao Cliente -->
        <div class="space-y-1.5 pt-1">
          <p class="font-extrabold text-xs text-slate-900 leading-snug">
            📲 Aponte a câmera do seu celular para abrir o cardápio e fazer seu pedido!
          </p>
          <p class="text-[9px] text-slate-500 font-sans leading-tight">
            Seu pedido será enviado diretamente para a cozinha e vinculado a esta mesa.
          </p>
        </div>

        <!-- Selo de Segurança Criptográfica -->
        <div class="pt-2 border-t border-slate-200 text-[8px] text-slate-500 space-y-0.5">
          <div class="font-bold flex items-center justify-center gap-1 text-slate-700">
            <span>🔒</span>
            <span>TOKEN SEGURO ASSINADO VIA HMAC-SHA256</span>
          </div>
          <p class="truncate text-[7px] text-slate-400 font-mono">
            {table.signedQrToken || 'Assinatura criptográfica válida'}
          </p>
        </div>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <PrimaryButton variant="secondary" on:click={onClose}>Fechar</PrimaryButton>
      <PrimaryButton variant="primary" on:click={handlePrint}>
        <Icon name="printer" size={14} className="mr-1" />
        🖨️ Imprimir Placa da Mesa
      </PrimaryButton>
    </svelte:fragment>
  </Modal>
{/if}

<style>
  @media print {
    :global(body *) {
      visibility: hidden;
    }
    #printable-table-card,
    #printable-table-card * {
      visibility: visible;
    }
    #printable-table-card {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      max-width: 320px;
      border: 3px solid #000 !important;
      box-shadow: none !important;
    }
  }
</style>
