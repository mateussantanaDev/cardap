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
  <div class="space-y-4 font-mono text-xs text-slate-800">
    <!-- Seletor de Largura da Bobina -->
    <div class="flex items-center justify-between bg-slate-100 p-2 border border-slate-300">
      <span class="text-[10px] font-bold uppercase text-slate-700">LARGURA DO PAPEL:</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-bold uppercase transition-colors cursor-pointer {paperWidth === '80mm' ? 'bg-red-600 text-white' : 'bg-white border border-slate-300 text-slate-700'}"
          on:click={() => paperWidth = '80mm'}
        >
          80mm Padrão
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-bold uppercase transition-colors cursor-pointer {paperWidth === '58mm' ? 'bg-red-600 text-white' : 'bg-white border border-slate-300 text-slate-700'}"
          on:click={() => paperWidth = '58mm'}
        >
          58mm Compacta
        </button>
      </div>
    </div>

    <!-- Preview da Comanda Térmica (Área de Impressão) -->
    <div class="bg-white border-2 border-dashed border-slate-400 p-4 shadow-inner max-h-[380px] overflow-y-auto print:border-none print:shadow-none print:p-0">
      <div
        id="thermal-receipt-content"
        class="mx-auto bg-white text-black font-mono text-xs leading-tight print:w-full"
        style="max-width: {paperWidth === '80mm' ? '300px' : '220px'}; font-size: {paperWidth === '80mm' ? '12px' : '10px'};"
      >
        <!-- Cabeçalho do Restaurante -->
        <div class="text-center pb-2 border-b border-black">
          <h2 class="text-sm font-black uppercase tracking-wider">IMPERIUS DO PASTEL</h2>
          <p class="text-[10px] text-slate-600">Cardap ERP — Sistema Integrado</p>
          <p class="text-[10px] text-slate-600">Tel: (87) 9 9603-6770</p>
        </div>

        <!-- Dados do Pedido -->
        <div class="py-2 border-b border-black space-y-0.5">
          <div class="flex justify-between font-black text-sm">
            <span>PEDIDO #{order?.orderNumber}</span>
            <span>{order?.type || 'DELIVERY'}</span>
          </div>
          <div class="text-[10px] text-slate-600">
            Data: {order?.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
          </div>
          {#if order?.type === 'SALAO'}
            <div class="font-black text-amber-900 bg-amber-100 p-1 mt-1 border border-amber-400 text-center">
              🪑 CONSUMO NA MESA: {order?.tableNumber || order?.table?.number || '?'}
            </div>
          {/if}
        </div>

        <!-- Cliente / Endereço se Delivery -->
        {#if order?.customerName || order?.customer?.name || order?.type === 'DELIVERY'}
          <div class="py-2 border-b border-black text-[11px] space-y-0.5">
            <div class="font-bold">CLIENTE: {order?.customerName || order?.customer?.name || 'Balcão'}</div>
            {#if order?.customerPhone || order?.customer?.phone}
              <div>FONE: {order?.customerPhone || order?.customer?.phone}</div>
            {/if}
            {#if order?.addressStreet || order?.customer?.addressStreet}
              <div class="font-bold mt-1">
                ENTREGA: {order?.addressStreet || order?.customer?.addressStreet}, {order?.addressNumber || order?.customer?.addressNumber || 'S/N'}
              </div>
              <div>BAIRRO: {order?.addressNeighborhood || order?.customer?.addressNeighborhood || 'Centro'}</div>
              {#if order?.addressComplement || order?.customer?.addressComplement}
                <div class="text-[10px] italic">REF: {order?.addressComplement || order?.customer?.addressComplement}</div>
              {/if}
            {/if}
          </div>
        {/if}

        <!-- Lista de Itens -->
        <div class="py-2 border-b border-black space-y-2">
          <div class="font-black text-[10px] uppercase border-b border-dotted border-black pb-1 flex justify-between">
            <span>ITEM / QTD</span>
            <span>VALOR</span>
          </div>

          {#if order?.items}
            {#each order.items as item}
              <div class="space-y-0.5">
                <div class="flex justify-between font-bold">
                  <span>{item.quantity}x {item.productName || item.product?.name}</span>
                  <span>{item.totalPrice ? `R$ ${Number(item.totalPrice).toFixed(2).replace('.', ',')}` : ''}</span>
                </div>

                <!-- Modificadores e Montagem -->
                {#if item.assemblies && item.assemblies.length > 0}
                  <div class="pl-2 text-[10px] text-slate-700">
                    {#each item.assemblies as a}
                      <div>• {a.name}</div>
                    {/each}
                  </div>
                {/if}

                {#if item.modifiers && item.modifiers.length > 0}
                  <div class="pl-2 text-[10px] text-slate-700">
                    {#each item.modifiers as m}
                      <div>• {m.name}</div>
                    {/each}
                  </div>
                {/if}

                <!-- Observação do Item -->
                {#if item.notes}
                  <div class="pl-2 font-black text-red-900 bg-red-50 text-[10px]">
                    OBS: {item.notes}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>

        <!-- Totais e Pagamento -->
        <div class="py-2 space-y-1 text-xs">
          {#if order?.deliveryFee && Number(order.deliveryFee) > 0}
            <div class="flex justify-between text-slate-600">
              <span>Taxa de Entrega:</span>
              <span>R$ {Number(order.deliveryFee).toFixed(2).replace('.', ',')}</span>
            </div>
          {/if}
          {#if order?.discountAmount && Number(order.discountAmount) > 0}
            <div class="flex justify-between text-emerald-700 font-bold">
              <span>Desconto:</span>
              <span>- R$ {Number(order.discountAmount).toFixed(2).replace('.', ',')}</span>
            </div>
          {/if}
          <div class="flex justify-between font-black text-sm pt-1 border-t border-black">
            <span>TOTAL:</span>
            <span>{order?.totalAmountFormatted || (order?.totalAmount ? `R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}` : 'R$ 0,00')}</span>
          </div>

          <div class="pt-1.5 text-[10px] font-bold text-slate-700 uppercase">
            PAGAMENTO: {order?.paymentMethod || 'PIX'} ({order?.paymentStatus || 'PENDENTE'})
          </div>
        </div>

        <!-- Rodapé do Cupom Fiscal / Não Fiscal -->
        <div class="text-center pt-3 border-t border-black text-[9px] text-slate-500 space-y-0.5">
          <p>*** DOCUMENTO NÃO FISCAL ***</p>
          <p>Acompanhe online em usecardap.com.br</p>
          <p class="pt-2">--------------------------------</p>
          <p class="text-[8px]">CORTE DO PAPEL AQUI</p>
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
      visibility: hidden;
    }
    #thermal-receipt-content,
    #thermal-receipt-content * {
      visibility: visible;
    }
    #thermal-receipt-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      margin: 0;
      padding: 0;
    }
  }
</style>
