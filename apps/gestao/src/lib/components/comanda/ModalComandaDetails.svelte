<script lang="ts">
  import Modal from '$ui/Modal.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Icon from '$components/Icon.svelte';
  import { PrinterService } from '$services/printerService';

  export let isOpen: boolean = false;
  export let order: {
    id?: string;
    orderNumber: number | string;
    type: 'SALAO' | 'BALCAO' | 'DELIVERY' | string;
    status: string;
    tableNumber?: number | string;
    customerName?: string;
    customerPhone?: string;
    customerCpf?: string;
    deliveryAddress?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    } | string;
    paymentMethod?: string;
    paymentStatus?: string;
    notes?: string;
    changeFor?: string | number;
    subtotalFormatted?: string;
    deliveryFeeFormatted?: string;
    discountFormatted?: string;
    totalAmountFormatted: string;
    createdAt?: string | Date;
    items?: Array<{
      id?: string;
      name?: string;
      productName?: string;
      qty?: number;
      quantity?: number;
      priceFormatted?: string;
      unitPriceFormatted?: string;
      totalPriceFormatted?: string;
      notes?: string;
      assemblies?: Array<any>;
      modifiers?: Array<any>;
      complements?: Array<any>;
    }>;
  } | null = null;

  export let onClose: () => void = () => {};
  export let onPaymentDone: () => void = () => {};

  let receiptText = '';
  let showReceipt = false;
  let isCancelling = false;

  $: if (order) {
    showReceipt = false;
  }

  $: customerDisplayName = order?.customerName || (order?.type === 'SALAO' ? `Mesa ${order?.tableNumber || ''}` : (order?.type === 'BALCAO' ? 'Cliente Balcão' : 'Cliente Delivery'));

  $: rawPhone = (order?.customerPhone || '').replace(/\D/g, '');
  $: formattedPhone = rawPhone.length === 11
    ? `(${rawPhone.slice(0, 2)}) ${rawPhone.slice(2, 7)}-${rawPhone.slice(7)}`
    : (order?.customerPhone || '');

  $: whatsappUrl = rawPhone
    ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(`Olá ${customerDisplayName}, referente ao seu pedido #${order?.orderNumber || ''}...`)}`
    : '';

  $: fullAddressString = (() => {
    if (!order?.deliveryAddress) return '';
    if (typeof order.deliveryAddress === 'string') return order.deliveryAddress;
    const a = order.deliveryAddress;
    const parts = [
      a.street ? `${a.street}${a.number ? `, ${a.number}` : ''}` : '',
      a.complement ? `(${a.complement})` : '',
      a.neighborhood ? `Bairro: ${a.neighborhood}` : '',
      a.city ? `${a.city}${a.state ? ` - ${a.state}` : ''}` : '',
      a.zipCode ? `CEP: ${a.zipCode}` : ''
    ].filter(Boolean);
    return parts.join(', ');
  })();

  $: mapsUrl = fullAddressString
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressString)}`
    : '';

  $: wazeUrl = fullAddressString
    ? `https://waze.com/ul?q=${encodeURIComponent(fullAddressString)}`
    : '';

  function handlePrintReceipt() {
    if (!order) return;
    receiptText = PrinterService.generateReceiptText({
      orderNumber: Number(order.orderNumber) || 101,
      type: (order.type as any) || 'DELIVERY',
      status: order.status || 'PRONTO',
      paymentMethod: (order.paymentMethod as any) || 'PIX',
      paymentStatus: (order.paymentStatus as any) || 'PAGO',
      tableNumber: order.tableNumber,
      customerName: customerDisplayName,
      customerPhone: order.customerPhone,
      customerCpf: order.customerCpf,
      deliveryAddress: typeof order.deliveryAddress === 'object' ? order.deliveryAddress : undefined,
      orderNotes: order.notes,
      changeFor: order.changeFor ? String(order.changeFor) : undefined,
      subtotalFormatted: order.subtotalFormatted || order.totalAmountFormatted,
      deliveryFeeFormatted: order.deliveryFeeFormatted || 'R$ 0,00',
      discountFormatted: order.discountFormatted || 'R$ 0,00',
      totalAmountFormatted: order.totalAmountFormatted,
      createdAt: order.createdAt || new Date(),
      items: (order.items && order.items.length > 0 ? order.items : [
        { productName: 'Consumo', quantity: 1, totalPriceFormatted: order.totalAmountFormatted }
      ]).map(i => ({
        productName: i.productName || i.name || 'Produto',
        quantity: i.quantity || i.qty || 1,
        unitPriceFormatted: i.unitPriceFormatted || i.priceFormatted || '',
        totalPriceFormatted: i.totalPriceFormatted || i.priceFormatted || '',
        notes: i.notes,
        assemblies: (i.assemblies || []).map(a => typeof a === 'string' ? a : a.name),
        modifiers: (i.modifiers || []).map(m => typeof m === 'string' ? m : m.name),
        complements: (i.complements || []).map(c => typeof c === 'string' ? c : c.name)
      }))
    });
    showReceipt = true;
  }

  async function handleCancelOrder() {
    if (!order?.id && !order?.orderNumber) return;
    const reason = prompt('Informe o motivo do cancelamento do pedido:');
    if (!reason || reason.trim().length < 3) {
      alert('É necessário informar um motivo de cancelamento com no mínimo 3 caracteres.');
      return;
    }

    isCancelling = true;
    const orderIdToCancel = order.id || String(order.orderNumber);

    try {
      const res = await fetch(`/api/orders/${orderIdToCancel}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Pedido cancelado com sucesso.');
        onPaymentDone();
        onClose();
      } else {
        alert(data.error || 'Erro ao cancelar pedido.');
      }
    } catch (e: any) {
      alert(`Falha na requisição de cancelamento: ${e.message}`);
    } finally {
      isCancelling = false;
    }
  }
</script>

{#if isOpen && order}
  <Modal
    {isOpen}
    title={`Pedido #${order.orderNumber} — ${order.type === 'DELIVERY' ? '🛵 DELIVERY' : (order.type === 'SALAO' ? '🍽️ SALÃO' : '🏪 BALCÃO')}`}
    subtitle={order.tableNumber ? `Mesa ${String(order.tableNumber).padStart(2, '0')} (Salão Presencial)` : 'Atendimento Balcão / Entrega Delivery'}
    maxWidth="lg"
    {onClose}
  >
    {#if !showReceipt}
      <div class="space-y-4 font-mono text-xs text-slate-900">
        
        <!-- Header de Status e Total -->
        <div class="p-3 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="font-bold uppercase text-slate-600 text-[10px]">Status:</span>
            <StatusBadge status={order.status} />
            <span class="text-[10px] font-bold px-2 py-0.5 border {order.type === 'DELIVERY' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'}">
              {order.type}
            </span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 uppercase font-bold mr-1">Valor Total:</span>
            <span class="font-extrabold text-red-600 text-sm">{order.totalAmountFormatted}</span>
          </div>
        </div>

        <!-- 👤 Bloco do Cliente & Contato -->
        <div class="p-3 bg-white border border-slate-200 space-y-2">
          <div class="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1 border-b border-slate-100 pb-1">
            <Icon name="user" size={13} className="text-slate-600" />
            Dados do Cliente & Contato
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <span class="text-[10px] text-slate-400 uppercase block">Nome:</span>
              <strong class="text-sm font-bold text-slate-900 font-sans">{customerDisplayName}</strong>
              {#if order.customerCpf}
                <span class="text-[11px] text-slate-500 block">CPF: {order.customerCpf}</span>
              {/if}
            </div>

            <div>
              <span class="text-[10px] text-slate-400 uppercase block">WhatsApp / Telefone:</span>
              {#if formattedPhone}
                <div class="flex items-center gap-2 mt-0.5">
                  <strong class="text-slate-900">{formattedPhone}</strong>
                  {#if whatsappUrl}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase rounded flex items-center gap-1 transition-colors"
                      title="Abrir conversa no WhatsApp"
                    >
                      <span>WhatsApp</span> ➔
                    </a>
                  {/if}
                </div>
              {:else}
                <span class="text-slate-400 italic">Não informado</span>
              {/if}
            </div>
          </div>
        </div>

        <!-- 📍 Bloco de Entrega (Se houver endereço) -->
        {#if fullAddressString || order.type === 'DELIVERY'}
          <div class="p-3 bg-blue-50/60 border border-blue-200 space-y-2">
            <div class="text-[10px] uppercase font-bold text-blue-900 tracking-widest flex items-center justify-between border-b border-blue-200/60 pb-1">
              <span class="flex items-center gap-1">
                <Icon name="truck" size={13} className="text-blue-700" />
                Endereço de Entrega (Delivery)
              </span>
              {#if mapsUrl}
                <div class="flex items-center gap-1.5">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-2 py-0.5 bg-white text-blue-700 hover:bg-blue-100 border border-blue-300 text-[10px] font-bold uppercase rounded flex items-center gap-1"
                  >
                    🗺️ Maps
                  </a>
                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-2 py-0.5 bg-white text-blue-700 hover:bg-blue-100 border border-blue-300 text-[10px] font-bold uppercase rounded flex items-center gap-1"
                  >
                    🚗 Waze
                  </a>
                </div>
              {/if}
            </div>

            <div class="text-xs font-sans text-slate-900 font-bold leading-relaxed pt-1">
              {fullAddressString || 'Endereço a ser confirmado com o cliente'}
            </div>
          </div>
        {/if}

        <!-- 💳 Bloco de Pagamento -->
        <div class="p-3 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-500 block">Forma de Pagamento:</span>
            <strong class="text-slate-900 text-xs font-bold uppercase">
              {order.paymentMethod || 'A COMBINAR'}
            </strong>
            {#if order.changeFor}
              <span class="text-amber-800 text-[11px] font-bold block mt-0.5">
                💵 Troco para: {typeof order.changeFor === 'number' ? `R$ ${order.changeFor.toFixed(2).replace('.', ',')}` : order.changeFor}
              </span>
            {/if}
          </div>
          <div class="text-right">
            <span class="text-[10px] uppercase font-bold text-slate-500 block">Status Pagamento:</span>
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase {order.paymentStatus === 'PAGO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}">
              {order.paymentStatus || 'PENDENTE'}
            </span>
          </div>
        </div>

        <!-- 📝 Observações do Pedido -->
        {#if order.notes}
          <div class="p-3 bg-amber-50 border border-amber-300 space-y-1">
            <div class="text-[10px] uppercase font-bold text-amber-900 flex items-center gap-1">
              <Icon name="alert" size={13} className="text-amber-700" />
              Observações do Cliente / Pedido:
            </div>
            <p class="text-xs font-sans text-amber-950 font-bold leading-relaxed">
              {order.notes}
            </p>
          </div>
        {/if}

        <!-- 🍽️ Itens Lançados -->
        <div>
          <span class="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">
            Itens do Pedido ({order.items?.length || 0}):
          </span>

          {#if !order.items || order.items.length === 0}
            <div class="p-6 border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-1">
              <div class="text-slate-400 text-xl">🍽️</div>
              <div class="font-bold text-slate-700">Nenhum item lançado</div>
            </div>
          {:else}
            <div class="divide-y divide-slate-100 border border-slate-200 bg-white">
              {#each order.items as item}
                <div class="p-3">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="font-bold text-slate-900 text-xs">
                        {item.quantity || item.qty || 1}x {item.productName || item.name}
                      </span>
                    </div>
                    <span class="text-slate-900 font-bold text-xs">
                      {item.totalPriceFormatted || item.priceFormatted || ''}
                    </span>
                  </div>

                  <!-- Montagens / Adicionais -->
                  {#if item.assemblies && item.assemblies.length > 0}
                    <div class="mt-1 pl-2 border-l-2 border-amber-500 text-[11px] text-slate-600 space-y-0.5">
                      {#each item.assemblies as a}
                        <div>• {typeof a === 'string' ? a : a.name}</div>
                      {/each}
                    </div>
                  {/if}

                  <!-- Modificadores -->
                  {#if item.modifiers && item.modifiers.length > 0}
                    <div class="mt-1 pl-2 border-l-2 border-blue-500 text-[11px] text-slate-600 space-y-0.5">
                      {#each item.modifiers as m}
                        <div>• {typeof m === 'string' ? m : m.name}</div>
                      {/each}
                    </div>
                  {/if}

                  <!-- Complementos -->
                  {#if item.complements && item.complements.length > 0}
                    <div class="mt-1 pl-2 border-l-2 border-emerald-500 text-[11px] text-slate-600 space-y-0.5">
                      {#each item.complements as c}
                        <div>• {typeof c === 'string' ? c : `${c.quantity || 1}x ${c.name}`}</div>
                      {/each}
                    </div>
                  {/if}

                  {#if item.notes}
                    <div class="mt-1 text-[10px] text-amber-800 bg-amber-50 p-1 border border-amber-200">
                      Obs: {item.notes}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        <span class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Icon name="printer" size={16} className="text-slate-600" />
          Visualização da Notinha Térmica (ESC/POS)
        </span>
        <pre class="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] leading-tight overflow-x-auto border border-slate-800 rounded-none max-h-[350px]">{receiptText}</pre>
      </div>
    {/if}

    <svelte:fragment slot="footer">
      <div class="flex flex-wrap items-center justify-between w-full gap-2">
        <div>
          {#if !showReceipt && order.status !== 'CANCELADO' && order.status !== 'ENTREGUE'}
            <PrimaryButton variant="danger" size="sm" disabled={isCancelling} on:click={handleCancelOrder}>
              <Icon name="trash" size={13} className="mr-1" />
              Cancelar Pedido
            </PrimaryButton>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <PrimaryButton variant="secondary" on:click={onClose}>Fechar</PrimaryButton>
          {#if !showReceipt}
            <PrimaryButton variant="secondary" on:click={handlePrintReceipt}>
              <Icon name="printer" size={14} className="mr-1" />
              Cupom Térmico
            </PrimaryButton>
            {#if order.paymentStatus !== 'PAGO'}
              <PrimaryButton variant="primary" shortcut="F2" on:click={() => { onPaymentDone(); onClose(); }}>
                Receber / Liquidar
              </PrimaryButton>
            {/if}
          {:else}
            <PrimaryButton variant="primary" on:click={() => showReceipt = false}>
              Voltar aos Detalhes
            </PrimaryButton>
          {/if}
        </div>
      </div>
    </svelte:fragment>
  </Modal>
{/if}
