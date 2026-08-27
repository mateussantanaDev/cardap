<script lang="ts">
  import Modal from './Modal.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';
  import { PrinterService, type PrintableOrder } from '$services/printerService';

  export let isOpen = false;
  export let onClose = () => {};
  export let stats: any = null;

  let paperWidth: '80mm' | '58mm' = '80mm';
  let isPrintingAgent = false;
  let printFeedback = '';

  function handleBrowserPrint() {
    const printElement = document.getElementById('thermal-report-content');
    if (!printElement) {
      window.print();
      return;
    }
    const win = window.open('', '_blank', 'width=450,height=700');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Fechamento Diário</title>
          <style>
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, "Courier New", Courier, monospace; font-size: ${paperWidth === '80mm' ? '12px' : '10.5px'}; font-weight: bold; color: #000; }
            * { color: #000 !important; background: transparent !important; }
            .bg-slate-200, .bg-slate-100 { background: #eee !important; }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  }

  async function handleAgentPrint() {
    if (!stats || isPrintingAgent) return;
    isPrintingAgent = true;
    printFeedback = '';

    const rest = stats.restaurant || {};
    const production = stats.productionItems || [];
    const modalities = stats.modalities || {};
    const paymentMethods = stats.paymentMethods || {};

    const itemsForPrint = [
      ...production.map((p: any) => ({
        productName: `${p.quantity}x ${p.name}`,
        quantity: 1,
        unitPriceFormatted: p.totalFormatted || 'R$ 0,00',
        totalPriceFormatted: p.totalFormatted || 'R$ 0,00'
      }))
    ];

    const printable: PrintableOrder = {
      restaurantName: rest.name || 'Estabelecimento',
      restaurantPhone: rest.phone || '',
      restaurantCnpj: rest.cnpj || '',
      restaurantAddress: rest.address || '',
      orderNumber: 9999,
      type: 'BALCAO',
      status: 'PRONTO',
      paymentMethod: 'TODOS',
      paymentStatus: 'PAGO',
      customerName: 'RELATÓRIO DE PRODUÇÃO E FECHAMENTO',
      orderNotes: `RESUMO DO DIA:\n- Salão: ${modalities.SALAO?.count || 0} (${modalities.SALAO?.totalFormatted || 'R$ 0,00'})\n- Balcão: ${modalities.BALCAO?.count || 0} (${modalities.BALCAO?.totalFormatted || 'R$ 0,00'})\n- Delivery: ${modalities.DELIVERY?.count || 0} (${modalities.DELIVERY?.totalFormatted || 'R$ 0,00'})\n\nFORMAS DE PAGAMENTO:\n- Dinheiro: ${paymentMethods.DINHEIRO?.totalFormatted || 'R$ 0,00'}\n- PIX: ${paymentMethods.PIX?.totalFormatted || 'R$ 0,00'}\n- Crédito: ${paymentMethods.CARTAO_CREDITO?.totalFormatted || 'R$ 0,00'}\n- Débito: ${paymentMethods.CARTAO_DEBITO?.totalFormatted || 'R$ 0,00'}`,
      subtotalFormatted: stats.totalSalesFormatted || 'R$ 0,00',
      deliveryFeeFormatted: stats.totalDeliveryFeesFormatted || 'R$ 0,00',
      discountFormatted: stats.totalDiscountsFormatted || 'R$ 0,00',
      totalAmountFormatted: stats.totalSalesFormatted || 'R$ 0,00',
      createdAt: new Date().toISOString(),
      items: itemsForPrint
    };

    const result = await PrinterService.printDirect(printable, 'CAIXA', { cut: true, beep: true });
    isPrintingAgent = false;

    if (result.success) {
      printFeedback = `✅ Relatório impresso com sucesso na impressora "${result.printerUsed || 'Térmica'}"!`;
      setTimeout(() => {
        printFeedback = '';
        onClose();
      }, 2500);
    } else {
      printFeedback = `⚠️ Falha ao imprimir no agente: ${result.error || 'Agente offline'}. Verifique se o Cardap Print Agent está rodando.`;
    }
  }

  $: totalItemsProduced = (stats?.productionItems || []).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);
</script>

<Modal
  {isOpen}
  {onClose}
  title="Relatório de Produção & Fechamento Diário"
  subtitle="Consolidado completo de faturamento, modalidades, formas de pagamento e itens produzidos"
  maxWidth="lg"
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

    {#if printFeedback}
      <div class="p-2.5 bg-slate-900 text-white font-mono text-xs font-bold text-center">
        {printFeedback}
      </div>
    {/if}

    <!-- Área de Preview Térmico -->
    <div class="bg-white border-2 border-black p-4 shadow-inner max-h-[480px] overflow-y-auto print:border-none print:shadow-none print:p-0">
      <div
        id="thermal-report-content"
        class="mx-auto bg-white text-black font-mono leading-snug print:w-full font-bold"
        style="max-width: {paperWidth === '80mm' ? '320px' : '230px'}; font-size: {paperWidth === '80mm' ? '12px' : '10.5px'}; color: #000000 !important;"
      >
        <!-- Cabeçalho -->
        <div class="text-center pb-2 border-b-2 border-black space-y-0.5">
          <h2 class="text-sm font-black uppercase tracking-wider text-black">{stats?.restaurant?.name || 'ESTABELECIMENTO'}</h2>
          <p class="text-[11px] font-bold text-black">CARDAP ERP — FECHAMENTO DIÁRIO</p>
          {#if stats?.restaurant?.phone}
            <p class="text-[11px] font-black text-black">Tel: {stats.restaurant.phone}</p>
          {/if}
          {#if stats?.restaurant?.cnpj}
            <p class="text-[10px] text-black">CNPJ: {stats.restaurant.cnpj}</p>
          {/if}
          {#if stats?.restaurant?.address}
            <p class="text-[10px] text-black">{stats.restaurant.address}</p>
          {/if}
          <div class="pt-1 text-[10px] font-black border-t border-dashed border-black">
            EMISSÃO: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        <!-- 1. Resumo Geral de Faturamento -->
        <div class="py-2 border-b-2 border-black space-y-1">
          <div class="text-center font-black text-xs uppercase bg-black text-white p-1 mb-1.5">
            1. RESUMO GERAL DE VENDAS
          </div>
          <div class="flex justify-between font-black text-sm text-black">
            <span>TOTAL FATURADO:</span>
            <span>{stats?.totalSalesFormatted || 'R$ 0,00'}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>Total de Pedidos:</span>
            <span>{stats?.totalOrdersCount || 0} pedido(s)</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>Ticket Médio:</span>
            <span>{stats?.averageTicketFormatted || 'R$ 0,00'}</span>
          </div>
          {#if stats?.totalDeliveryFeesCents && stats.totalDeliveryFeesCents > 0}
            <div class="flex justify-between text-xs">
              <span>Total Taxas de Entrega:</span>
              <span>{stats?.totalDeliveryFeesFormatted}</span>
            </div>
          {/if}
          {#if stats?.totalDiscountsCents && stats.totalDiscountsCents > 0}
            <div class="flex justify-between text-xs">
              <span>Total de Descontos:</span>
              <span>- {stats?.totalDiscountsFormatted}</span>
            </div>
          {/if}
        </div>

        <!-- 2. Vendas por Modalidade -->
        <div class="py-2 border-b-2 border-black space-y-1">
          <div class="text-center font-black text-xs uppercase bg-slate-200 border border-black p-0.5 mb-1.5">
            2. VENDAS POR CANAL / MODALIDADE
          </div>
          <div class="flex justify-between text-xs">
            <span>🪑 Salão / Mesas:</span>
            <span>{stats?.modalities?.SALAO?.count || 0}x ({stats?.modalities?.SALAO?.totalFormatted || 'R$ 0,00'})</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>🛍️ Balcão / Retirada:</span>
            <span>{stats?.modalities?.BALCAO?.count || 0}x ({stats?.modalities?.BALCAO?.totalFormatted || 'R$ 0,00'})</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>🛵 Delivery:</span>
            <span>{stats?.modalities?.DELIVERY?.count || 0}x ({stats?.modalities?.DELIVERY?.totalFormatted || 'R$ 0,00'})</span>
          </div>
        </div>

        <!-- 3. Vendas por Forma de Pagamento -->
        <div class="py-2 border-b-2 border-black space-y-1">
          <div class="text-center font-black text-xs uppercase bg-slate-200 border border-black p-0.5 mb-1.5">
            3. FORMAS DE PAGAMENTO
          </div>
          <div class="flex justify-between text-xs">
            <span>💵 Dinheiro:</span>
            <span>{stats?.paymentMethods?.DINHEIRO?.totalFormatted || 'R$ 0,00'}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>🔑 PIX:</span>
            <span>{stats?.paymentMethods?.PIX?.totalFormatted || 'R$ 0,00'}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>💳 Cartão de Crédito:</span>
            <span>{stats?.paymentMethods?.CARTAO_CREDITO?.totalFormatted || 'R$ 0,00'}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>💳 Cartão de Débito:</span>
            <span>{stats?.paymentMethods?.CARTAO_DEBITO?.totalFormatted || 'R$ 0,00'}</span>
          </div>
          {#if stats?.paymentMethods?.VR_VA?.count > 0}
            <div class="flex justify-between text-xs">
              <span>🎫 Vales / Outros:</span>
              <span>{stats?.paymentMethods?.VR_VA?.totalFormatted || 'R$ 0,00'}</span>
            </div>
          {/if}
        </div>

        <!-- 4. Relatório de Produção / Itens Vendidos -->
        <div class="py-2 border-b-2 border-black space-y-1.5">
          <div class="text-center font-black text-xs uppercase bg-black text-white p-1 mb-1.5">
            4. HISTÓRICO DE PRODUÇÃO (ITENS VENDIDOS)
          </div>
          <div class="flex justify-between text-[10px] uppercase border-b border-black pb-0.5">
            <span>PRODUTO / QTD</span>
            <span>TOTAL R$</span>
          </div>

          {#if stats?.productionItems && stats.productionItems.length > 0}
            {#each stats.productionItems as item}
              <div class="flex justify-between text-xs py-0.5 border-b border-dashed border-slate-300 last:border-b-0">
                <span class="truncate max-w-[190px]">{item.quantity}x {item.name}</span>
                <span>{item.totalFormatted}</span>
              </div>
            {/each}
            <div class="pt-1.5 flex justify-between font-black text-xs border-t border-black">
              <span>TOTAL DE ITENS PRODUZIDOS:</span>
              <span>{totalItemsProduced} un</span>
            </div>
          {:else}
            <div class="text-center py-2 text-slate-500 text-xs italic">
              Nenhum item vendido registrado hoje.
            </div>
          {/if}
        </div>

        <!-- Rodapé do Relatório -->
        <div class="text-center pt-3 text-[10px] font-black space-y-2">
          <p>*** CONFERÊNCIA INTERNA / FECHAMENTO ***</p>
          <div class="pt-6 border-b border-black w-3/4 mx-auto"></div>
          <p class="text-[9px] uppercase text-slate-600">Assinatura do Gerente / Responsável</p>
          <p class="pt-2 font-mono text-[9px]">--------------------------------</p>
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
          <span>⚡ Imprimir Relatório Térmico</span>
        </PrimaryButton>
      </div>
    </div>
  </svelte:fragment>
</Modal>
