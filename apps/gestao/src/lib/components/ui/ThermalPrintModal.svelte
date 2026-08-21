<script lang="ts">
  import Modal from './Modal.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';

  export let isOpen = false;
  export let onClose = () => {};
  export let order: any = null;

  let paperWidth: '80mm' | '58mm' = '80mm';

  function handlePrint() {
    window.print();
  }
</script>

<Modal
  {isOpen}
  {onClose}
  title={`IMPRIMIR COMANDA / RECIBO #${order?.orderNumber || ''}`}
  subtitle="Layout de impressão térmica otimizado para bobinas de 80mm e 58mm"
  maxWidth="md"
>
  <div class="space-y-4 font-mono text-xs text-black">
    <!-- Seletor de Largura da Bobina -->
    <div class="flex items-center justify-between bg-slate-100 p-2 border border-slate-400">
      <span class="text-[10px] font-black uppercase text-black">LARGURA DO PAPEL:</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-black uppercase transition-colors cursor-pointer {paperWidth === '80mm' ? 'bg-red-600 text-white' : 'bg-white border border-black text-black'}"
          on:click={() => paperWidth = '80mm'}
        >
          80mm Padrão
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-black uppercase transition-colors cursor-pointer {paperWidth === '58mm' ? 'bg-red-600 text-white' : 'bg-white border border-black text-black'}"
          on:click={() => paperWidth = '58mm'}
        >
          58mm Compacta
        </button>
      </div>
    </div>

    <!-- Preview da Comanda Térmica (Área de Impressão de Alto Contraste) -->
    <div class="bg-white border-2 border-black p-4 shadow-inner max-h-[420px] overflow-y-auto print:border-none print:shadow-none print:p-0">
      <div
        id="thermal-receipt-content"
        class="mx-auto bg-white text-black font-mono leading-snug print:w-full font-bold"
        style="max-width: {paperWidth === '80mm' ? '300px' : '220px'}; font-size: {paperWidth === '80mm' ? '12px' : '10.5px'}; color: #000000 !important;"
      >
        <!-- Cabeçalho do Restaurante -->
        <div class="text-center pb-2 border-b-2 border-black space-y-0.5">
          <h2 class="text-sm font-black uppercase tracking-wider text-black">IMPERIUS DO PASTEL</h2>
          <p class="text-[11px] font-bold text-black">CARDAP ERP — SISTEMA INTEGRADO</p>
          <p class="text-[11px] font-black text-black">Tel: {order?.restaurantPhone || '(11) 99999-9999'}</p>
        </div>

        <!-- Dados do Pedido -->
        <div class="py-2 border-b-2 border-black space-y-1">
          <div class="flex justify-between font-black text-sm text-black">
            <span>PEDIDO #{order?.orderNumber}</span>
            <span>{order?.type || 'DELIVERY'}</span>
          </div>
          <div class="text-[11px] font-bold text-black">
            Data: {order?.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
          </div>
          {#if order?.type === 'SALAO'}
            <div class="font-black text-black bg-slate-200 p-1.5 mt-1 border-2 border-black text-center text-xs">
              🪑 CONSUMO NA MESA: {order?.tableNumber || order?.table?.number || '?'}
            </div>
          {/if}
        </div>

        <!-- Cliente / Endereço se Delivery -->
        {#if order?.customerName || order?.customer?.name || order?.type === 'DELIVERY'}
          <div class="py-2 border-b-2 border-black text-xs space-y-0.5 text-black">
            <div class="font-black">CLIENTE: {order?.customerName || order?.customer?.name || 'Balcão'}</div>
            {#if order?.customerPhone || order?.customer?.phone}
              <div class="font-bold">FONE: {order?.customerPhone || order?.customer?.phone}</div>
            {/if}
            {#if order?.addressStreet || order?.customer?.addressStreet}
              <div class="font-black mt-1">
                ENTREGA: {order?.addressStreet || order?.customer?.addressStreet}, {order?.addressNumber || order?.customer?.addressNumber || 'S/N'}
              </div>
              <div class="font-bold">BAIRRO: {order?.addressNeighborhood || order?.customer?.addressNeighborhood || 'Centro'}</div>
              {#if order?.addressComplement || order?.customer?.addressComplement}
                <div class="font-black">REF: {order?.addressComplement || order?.customer?.addressComplement}</div>
              {/if}
            {/if}
          </div>
        {/if}

        <!-- Lista de Itens -->
        <div class="py-2 border-b-2 border-black space-y-2">
          <div class="font-black text-xs uppercase border-b-2 border-black pb-1 flex justify-between text-black">
            <span>ITEM / QTD</span>
            <span>VALOR</span>
          </div>

          {#if order?.items}
            {#each order.items as item}
              <div class="space-y-0.5 text-black">
                <div class="flex justify-between font-black text-xs">
                  <span>{item.quantity}x {item.productName || item.product?.name}</span>
                  <span>{item.totalPrice ? `R$ ${Number(item.totalPrice).toFixed(2).replace('.', ',')}` : ''}</span>
                </div>

                <!-- Modificadores e Montagem -->
                {#if item.assemblies && item.assemblies.length > 0}
                  <div class="pl-2 font-bold text-[11px] text-black">
                    {#each item.assemblies as a}
                      <div>• {a.name}</div>
                    {/each}
                  </div>
                {/if}

                {#if item.modifiers && item.modifiers.length > 0}
                  <div class="pl-2 font-bold text-[11px] text-black">
                    {#each item.modifiers as m}
                      <div>• {m.name}</div>
                    {/each}
                  </div>
                {/if}

                <!-- Observação do Item -->
                {#if item.notes}
                  <div class="pl-1.5 font-black text-black bg-slate-200 border border-black text-[11px] p-0.5">
                    OBS: {item.notes}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>

        <!-- Totais e Pagamento -->
        <div class="py-2 space-y-1 text-xs text-black font-bold">
          {#if order?.deliveryFee && Number(order.deliveryFee) > 0}
            <div class="flex justify-between">
              <span>Taxa de Entrega:</span>
              <span>R$ {Number(order.deliveryFee).toFixed(2).replace('.', ',')}</span>
            </div>
          {/if}
          {#if order?.discountAmount && Number(order.discountAmount) > 0}
            <div class="flex justify-between font-black">
              <span>Desconto:</span>
              <span>- R$ {Number(order.discountAmount).toFixed(2).replace('.', ',')}</span>
            </div>
          {/if}
          <div class="flex justify-between font-black text-sm pt-1.5 border-t-2 border-black">
            <span>TOTAL:</span>
            <span>{order?.totalAmountFormatted || (order?.totalAmount ? `R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}` : 'R$ 0,00')}</span>
          </div>

          <div class="pt-2 text-xs font-black uppercase text-black">
            PAGAMENTO: {order?.paymentMethod || 'PIX'} ({order?.paymentStatus || 'PENDENTE'})
          </div>
        </div>

        <!-- Rodapé do Cupom Fiscal / Não Fiscal -->
        <div class="text-center pt-3 border-t-2 border-black text-[10px] text-black font-black space-y-1">
          <p>*** DOCUMENTO NÃO FISCAL ***</p>
          <p>ACOMPANHE EM USECARDAP.COM.BR</p>
          <p class="pt-2 font-mono">--------------------------------</p>
          <p class="text-[9px]">CORTE DO PAPEL AQUI</p>
        </div>
      </div>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex items-center justify-between w-full">
      <PrimaryButton variant="secondary" size="sm" on:click={onClose}>
        Fechar
      </PrimaryButton>

      <PrimaryButton variant="primary" size="sm" shortcut="Ctrl+P" on:click={handlePrint}>
        <Icon name="printer" size={14} className="mr-1.5" />
        Imprimir Agora (ESC/POS)
      </PrimaryButton>
    </div>
  </svelte:fragment>
</Modal>

<style>
  @media print {
    :global(body *) {
      visibility: hidden !important;
    }
    #thermal-receipt-content,
    #thermal-receipt-content * {
      visibility: visible !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-weight: 900 !important;
    }
    #thermal-receipt-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  }
</style>
