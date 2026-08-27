<script lang="ts">
  import Modal from './Modal.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';
  import { PrinterService, type PrintableOrder } from '$services/printerService';

  export let isOpen = false;
  export let onClose = () => {};
  export let order: any = null;

  let paperWidth: '80mm' | '58mm' = '80mm';
  let isPrintingAgent = false;
  let printFeedback = '';

  function handleBrowserPrint() {
    window.print();
  }

  async function handleAgentPrint() {
    if (!order || isPrintingAgent) return;
    isPrintingAgent = true;
    printFeedback = '';

    const printable: PrintableOrder = {
      restaurantName: order.restaurantName || 'Estabelecimento',
      restaurantPhone: order.restaurantPhone || '',
      restaurantCnpj: order.restaurantCnpj || '',
      restaurantAddress: order.restaurantAddress || '',
      orderNumber: order.orderNumber || 101,
      type: order.type || 'DELIVERY',
      status: order.status || 'RECEBIDO',
      paymentMethod: order.paymentMethod || 'PIX',
      paymentStatus: order.paymentStatus || 'PAGO',
      tableNumber: order.tableNumber || order.table?.number,
      customerName: order.customerName || order.customer?.name || (order.type === 'SALAO' ? 'Mesa' : 'Cliente'),
      customerPhone: order.customerPhone || order.customer?.phone || '',
      customerCpf: order.customerCpf || order.customer?.cpf || '',
      deliveryAddress: order.deliveryAddress || (order.customer ? {
        street: order.customer.addressStreet,
        number: order.customer.addressNumber,
        complement: order.customer.addressComplement,
        neighborhood: order.customer.addressNeighborhood,
        city: order.customer.addressCity,
        state: order.customer.addressState,
        zipCode: order.customer.addressZipCode
      } : (order.addressStreet ? {
        street: order.addressStreet,
        number: order.addressNumber,
        complement: order.addressComplement,
        neighborhood: order.addressNeighborhood,
        city: order.addressCity,
        state: order.addressState,
        zipCode: order.addressZipCode
      } : undefined)),
      orderNotes: order.notes,
      changeFor: order.changeFor,
      subtotalFormatted: order.subtotalFormatted || (order.subtotal ? `R$ ${Number(order.subtotal).toFixed(2).replace('.', ',')}` : 'R$ 0,00'),
      deliveryFeeFormatted: order.deliveryFeeFormatted || (order.deliveryFee ? `R$ ${Number(order.deliveryFee).toFixed(2).replace('.', ',')}` : 'R$ 0,00'),
      discountFormatted: order.discountFormatted || (order.discountAmount ? `R$ ${Number(order.discountAmount).toFixed(2).replace('.', ',')}` : 'R$ 0,00'),
      totalAmountFormatted: order.totalAmountFormatted || (order.totalAmount ? `R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}` : 'R$ 0,00'),
      createdAt: order.createdAt || new Date().toISOString(),
      items: (order.items || []).map((it: any) => ({
        productName: it.productName || it.product?.name || it.name || 'Item',
        quantity: it.quantity || 1,
        unitPriceFormatted: it.unitPriceFormatted || (it.unitPrice ? `R$ ${Number(it.unitPrice).toFixed(2).replace('.', ',')}` : ''),
        totalPriceFormatted: it.totalPriceFormatted || (it.totalPrice ? `R$ ${Number(it.totalPrice).toFixed(2).replace('.', ',')}` : ''),
        notes: it.notes,
        assemblies: (it.assemblies || []).map((a: any) => typeof a === 'string' ? a : a.name),
        modifiers: (it.modifiers || []).map((m: any) => typeof m === 'string' ? m : m.name),
        complements: (it.complements || []).map((c: any) => typeof c === 'string' ? c : c.name)
      }))
    };

    const targetSector = order.type === 'DELIVERY' ? 'TODOS' : 'COZINHA';
    const result = await PrinterService.printDirect(printable, targetSector as any, { cut: true, beep: true });
    isPrintingAgent = false;

    if (result.success) {
      printFeedback = `✅ Impresso com sucesso na impressora "${result.printerUsed || 'Térmica'}"!`;
      setTimeout(() => {
        printFeedback = '';
        onClose();
      }, 2000);
    } else {
      printFeedback = `⚠️ Falha ao imprimir no agente: ${result.error || 'Agente offline'}. Usando impressão do navegador.`;
      setTimeout(() => {
        handleBrowserPrint();
      }, 1000);
    }
  }

  $: customerDisplayName = order?.customerName || order?.customer?.name || (order?.type === 'SALAO' ? `Mesa ${order?.tableNumber || order?.table?.number || ''}` : 'Cliente');
  $: restaurantDisplayName = order?.restaurantName || 'Estabelecimento';
  $: restaurantDisplayPhone = order?.restaurantPhone || '';

  $: deliveryAddr = order?.deliveryAddress || (order?.customer ? {
    street: order.customer.addressStreet,
    number: order.customer.addressNumber,
    complement: order.customer.addressComplement,
    neighborhood: order.customer.addressNeighborhood,
    city: order.customer.addressCity,
    zipCode: order.customer.addressZipCode
  } : (order?.addressStreet ? {
    street: order.addressStreet,
    number: order.addressNumber,
    complement: order.addressComplement,
    neighborhood: order.addressNeighborhood,
    city: order.addressCity,
    zipCode: order.addressZipCode
  } : null));
</script>

<Modal
  {isOpen}
  {onClose}
  title={`IMPRIMIR COMANDA / RECIBO #${order?.orderNumber || ''}`}
  subtitle="Layout de impressão térmica ESC/POS otimizado para bobinas de 80mm e 58mm"
  maxWidth="md"
>
  <div class="space-y-4 font-mono text-xs text-black">
    <!-- Seletor de Largura da Bobina & Status -->
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

    {#if printFeedback}
      <div class="p-2.5 bg-slate-900 text-white font-mono text-xs font-bold text-center">
        {printFeedback}
      </div>
    {/if}

    <!-- Preview da Comanda Térmica (Área de Impressão de Alto Contraste) -->
    <div class="bg-white border-2 border-black p-4 shadow-inner max-h-[420px] overflow-y-auto print:border-none print:shadow-none print:p-0">
      <div
        id="thermal-receipt-content"
        class="mx-auto bg-white text-black font-mono leading-snug print:w-full font-bold"
        style="max-width: {paperWidth === '80mm' ? '300px' : '220px'}; font-size: {paperWidth === '80mm' ? '12px' : '10.5px'}; color: #000000 !important;"
      >
        <!-- Cabeçalho do Restaurante -->
        <div class="text-center pb-2 border-b-2 border-black space-y-0.5">
          <h2 class="text-sm font-black uppercase tracking-wider text-black">{restaurantDisplayName.toUpperCase()}</h2>
          <p class="text-[11px] font-bold text-black">CARDAP ERP — SISTEMA INTEGRADO</p>
          <p class="text-[11px] font-black text-black">Tel: {restaurantDisplayPhone}</p>
          {#if order?.restaurantCnpj}
            <p class="text-[10px] text-black font-normal">CNPJ: {order.restaurantCnpj}</p>
          {/if}
          {#if order?.restaurantAddress}
            <p class="text-[10px] text-black font-normal">{order.restaurantAddress}</p>
          {/if}
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

        <!-- Cliente / Endereço Completo se Delivery -->
        <div class="py-2 border-b-2 border-black text-xs space-y-0.5 text-black">
          <div class="font-black">CLIENTE: {customerDisplayName}</div>
          {#if order?.customerPhone || order?.customer?.phone}
            <div class="font-bold">FONE: {order?.customerPhone || order?.customer?.phone}</div>
          {/if}
          {#if order?.customerCpf || order?.customer?.cpf}
            <div class="text-[11px]">CPF: {order?.customerCpf || order?.customer?.cpf}</div>
          {/if}

          {#if order?.type === 'DELIVERY' && deliveryAddr}
            <div class="mt-2 pt-1 border-t border-dashed border-black font-black">
              ================================<br/>
              📍 GUIA DE ENTREGA / MOTOBOY<br/>
              ================================
            </div>
            <div class="font-black text-xs">
              ENDEREÇO: {deliveryAddr.street || 'Rua não informada'}, {deliveryAddr.number || 'S/N'}
            </div>
            {#if deliveryAddr.complement}
              <div class="font-bold">COMPLEMENTO: {deliveryAddr.complement}</div>
            {/if}
            <div class="font-bold">BAIRRO: {deliveryAddr.neighborhood || 'Centro'}</div>
            {#if deliveryAddr.city}
              <div>CIDADE: {deliveryAddr.city}</div>
            {/if}
            {#if deliveryAddr.zipCode}
              <div>CEP: {deliveryAddr.zipCode}</div>
            {/if}
            {#if order?.notes}
              <div class="mt-1 p-1 bg-slate-100 border border-black font-bold text-[11px]">
                OBS ENTREGA: {order.notes}
              </div>
            {/if}
          {/if}
        </div>

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
                  <span>{item.quantity}x {item.productName || item.product?.name || item.name || 'Produto'}</span>
                  <span>{item.totalPriceFormatted || (item.totalPrice ? `R$ ${Number(item.totalPrice).toFixed(2).replace('.', ',')}` : '')}</span>
                </div>

                <!-- Modificadores e Montagem -->
                {#if item.assemblies && item.assemblies.length > 0}
                  <div class="pl-2 font-bold text-[11px] text-black">
                    {#each item.assemblies as a}
                      <div>• {typeof a === 'string' ? a : a.name}</div>
                    {/each}
                  </div>
                {/if}

                {#if item.modifiers && item.modifiers.length > 0}
                  <div class="pl-2 font-bold text-[11px] text-black">
                    {#each item.modifiers as m}
                      <div>• {typeof m === 'string' ? m : m.name}</div>
                    {/each}
                  </div>
                {/if}

                {#if item.complements && item.complements.length > 0}
                  <div class="pl-2 font-bold text-[11px] text-black">
                    {#each item.complements as c}
                      <div>+ {typeof c === 'string' ? c : c.name}</div>
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
          {#if order?.subtotalFormatted || order?.subtotal}
            <div class="flex justify-between">
              <span>Subtotal:</span>
              <span>{order?.subtotalFormatted || `R$ ${Number(order.subtotal).toFixed(2).replace('.', ',')}`}</span>
            </div>
          {/if}
          {#if order?.deliveryFee && Number(order.deliveryFee) > 0}
            <div class="flex justify-between">
              <span>Taxa de Entrega:</span>
              <span>{order?.deliveryFeeFormatted || `R$ ${Number(order.deliveryFee).toFixed(2).replace('.', ',')}`}</span>
            </div>
          {/if}
          {#if order?.discountAmount && Number(order.discountAmount) > 0}
            <div class="flex justify-between font-black">
              <span>Desconto:</span>
              <span>- {order?.discountFormatted || `R$ ${Number(order.discountAmount).toFixed(2).replace('.', ',')}`}</span>
            </div>
          {/if}
          <div class="flex justify-between font-black text-sm pt-1.5 border-t-2 border-black">
            <span>TOTAL:</span>
            <span>{order?.totalAmountFormatted || (order?.totalAmount ? `R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}` : 'R$ 0,00')}</span>
          </div>

          <div class="pt-2 text-xs font-black uppercase text-black">
            PAGAMENTO: {order?.paymentMethod || 'PIX'} ({order?.paymentStatus || 'PENDENTE'})
          </div>
          {#if order?.changeFor}
            <div class="p-1 bg-amber-100 border border-black text-black font-black text-xs">
              💵 LEVAR TROCO PARA: {order.changeFor}
            </div>
          {/if}
        </div>

        <!-- Rodapé do Cupom -->
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
    <div class="flex items-center justify-between w-full gap-2">
      <PrimaryButton variant="secondary" size="sm" on:click={onClose}>
        Fechar
      </PrimaryButton>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-2 bg-slate-800 hover:bg-black text-white font-mono text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
          on:click={handleBrowserPrint}
        >
          <Icon name="printer" size={14} />
          <span>Navegador</span>
        </button>

        <PrimaryButton variant="primary" size="sm" loading={isPrintingAgent} on:click={handleAgentPrint}>
          <Icon name="printer" size={14} className="mr-1.5" />
          <span>⚡ Imprimir no Agente Local</span>
        </PrimaryButton>
      </div>
    </div>
  </svelte:fragment>
</Modal>
