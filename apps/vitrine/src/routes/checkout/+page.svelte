<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';
  import PanelHeader from '$components/PanelHeader.svelte';
  import StatusBadge from '$components/StatusBadge.svelte';
  import FormField from '$components/FormField.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import Icon from '$components/Icon.svelte';
  import ModalWhatsAppSender from '$components/ModalWhatsAppSender.svelte';
  import { cartStore, cartSubtotalCents, cartSubtotalFormatted, cartItemCount } from '$stores/cartStore';

  export let data: PageData;

  const { currentSlug } = tenantVitrineManager;

  // State do formulário
  let customerName = 'Mateus Vieira';
  let customerPhone = '(87) 99603-6770';
  let addressStreet = 'Trav Padre Nelson';
  let addressNumber = '299';
  let addressNeighborhood = 'COMUNATY';
  let addressComplement = 'Primeira esquina à esquerda após armazém';
  let addressZipCode = '56500-000';
  let paymentOption: 'PIX' | 'DINHEIRO_ENTREGA' | 'CARTAO_ENTREGA' = 'CARTAO_ENTREGA';
  let orderNotes = '';

  // Cupom de Desconto
  let couponInputCode = '';
  let couponApplying = false;
  let couponMessage = '';
  let couponError = '';
  let appliedCoupon: any = null;
  let discountCents = 0;

  // Frete e SLA
  let deliveryFeeCents = data.isTableFlow ? 0 : 600;
  let estimatedSlaMinutes = 35;
  let isFreeDelivery = false;

  let isSubmitting = false;
  let isWhatsAppModalOpen = false;
  let currentOrderPayload: any = null;

  $: subtotal = $cartSubtotalCents;
  $: finalTotalCents = Math.max(0, subtotal - discountCents + deliveryFeeCents);

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  // Recalcular frete dinamicamente
  async function calculateDelivery() {
    if (data.isTableFlow) return;
    try {
      const res = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neighborhood: addressNeighborhood,
          zipCode: addressZipCode,
          subtotalCents: subtotal
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        deliveryFeeCents = json.data.deliveryFeeCents;
        estimatedSlaMinutes = json.data.estimatedSlaMinutes;
        isFreeDelivery = json.data.isFreeDelivery;
      }
    } catch {
      // Fallback
    }
  }

  // Aplicar Cupom de Desconto no Backend
  async function handleApplyCoupon() {
    if (!couponInputCode.trim()) return;
    couponApplying = true;
    couponMessage = '';
    couponError = '';

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInputCode,
          subtotalCents: subtotal
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        appliedCoupon = json.data;
        discountCents = json.data.discountCents;
        couponMessage = json.data.message;
      } else {
        couponError = json.error || 'Cupom inválido ou expirado.';
        appliedCoupon = null;
        discountCents = 0;
      }
    } catch (err: any) {
      couponError = 'Erro ao conectar ao servidor para validar cupom.';
    } finally {
      couponApplying = false;
    }
  }

  // Confirmar Pedido no Backend e no KDS
  async function handleConfirmOrder() {
    if (!$cartStore || $cartStore.length === 0 || !customerName.trim() || isSubmitting) return;

    isSubmitting = true;

    try {
      // Enviar pedido para a API Backend /api/orders
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.isTableFlow ? 'SALAO' : 'DELIVERY',
          customerName,
          customerPhone,
          addressStreet,
          addressNumber,
          addressNeighborhood,
          addressComplement,
          addressZipCode,
          tableNumber: data.tableNumber || undefined,
          paymentOption,
          subtotalCents: subtotal,
          discountCents,
          deliveryFeeCents,
          totalCents: finalTotalCents,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          notes: orderNotes,
          items: $cartStore.map(item => ({
            productId: item.productId,
            productName: item.productName,
            basePriceCents: item.basePriceCents,
            quantity: item.quantity,
            selectedAssemblies: item.selectedAssemblies || [],
            selectedModifiers: item.selectedModifiers || [],
            selectedComplements: item.selectedComplements || [],
            itemTotalCents: item.basePriceCents * item.quantity,
            notes: item.notes
          }))
        })
      });

      const orderData = await response.json();
      const orderId = orderData.orderId || `${Math.floor(40000 + Math.random() * 9000)}`;

      const now = new Date();
      now.setMinutes(now.getMinutes() + estimatedSlaMinutes);
      const estimatedTime = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

      const paymentLabel = paymentOption === 'PIX'
        ? 'PIX Instantâneo'
        : paymentOption === 'CARTAO_ENTREGA'
        ? 'Cartão de Débito/Crédito'
        : 'Dinheiro na Entrega';

      const fullAddress = data.isTableFlow
        ? `Consumo no Local — Mesa ${data.tableNumber}`
        : `${addressNeighborhood}, ${addressStreet}, ${addressNumber}${addressComplement ? `, ${addressComplement}` : ''}`;

      currentOrderPayload = {
        orderId,
        customerName,
        customerPhone,
        deliveryType: data.isTableFlow ? 'Consumo no Local' : 'Delivery',
        estimatedTime,
        paymentName: paymentLabel,
        fullAddress,
        items: $cartStore.map(i => ({
          name: i.productName,
          qty: i.quantity,
          priceFormatted: fmt(i.basePriceCents * i.quantity),
          obs: i.notes || undefined
        })),
        subtotalFormatted: fmt(subtotal),
        discountFormatted: discountCents > 0 ? fmt(discountCents) : undefined,
        deliveryFeeFormatted: fmt(deliveryFeeCents),
        totalFormatted: fmt(finalTotalCents),
        statusUrl: `https://app.cardaperp.com.br/status/${orderId}`
      };

      isWhatsAppModalOpen = true;
    } catch {
      // Fallback
    } finally {
      isSubmitting = false;
    }
  }

  function handleOrderSent() {
    if (!currentOrderPayload) return;
    const id = currentOrderPayload.orderId;

    try {
      const existing = localStorage.getItem('cardap_user_orders_v1');
      const orders = existing ? JSON.parse(existing) : [];
      const itemsSummary = currentOrderPayload.items.map((i: any) => `${i.qty}x ${i.name}`).join(', ');
      const newRecord = {
        id: currentOrderPayload.orderId,
        orderNumber: Math.floor(100 + Math.random() * 900),
        date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        type: currentOrderPayload.deliveryType === 'Consumo no Local' ? 'SALAO' : 'DELIVERY',
        itemsSummary,
        totalCents: finalTotalCents,
        status: 'RECEBIDO'
      };
      localStorage.setItem('cardap_user_orders_v1', JSON.stringify([newRecord, ...orders]));
    } catch (e) {
      console.error('Erro ao salvar pedido no localStorage:', e);
    }

    cartStore.clearCart();
    isWhatsAppModalOpen = false;
    goto(`/status/${id}?type=${data.isTableFlow ? 'SALAO' : 'DELIVERY'}&table=${data.tableNumber || ''}`);
  }

  $: if (subtotal > 0) {
    calculateDelivery();
  }
</script>

<div class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900">
  <!-- Header Institucional -->
  <header class="bg-slate-900 text-white p-4 space-y-1 sticky top-0 z-30 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <button
        type="button"
        on:click={() => goto(`/${$currentSlug}`)}
        class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <Icon name="arrow-left" size={12} />
        <span>VOLTAR</span>
      </button>
      <div>
        <h1 class="font-mono text-xs font-bold tracking-widest uppercase text-white leading-tight">
          FINALIZAR PEDIDO
        </h1>
        <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
          ESPANKA BURGUER · CONSOLIDAÇÃO DA SACOLA
        </span>
      </div>
    </div>
  </header>

  <main class="p-4 space-y-4 flex-1 pb-28">
    <!-- Banner de Canal de Atendimento -->
    {#if data.isTableFlow}
      <div class="border-2 border-amber-500 bg-amber-50 p-4 space-y-1">
        <div class="flex items-center justify-between">
          <h2 class="font-mono text-xs font-bold uppercase tracking-widest text-amber-900 flex items-center gap-1.5">
            <Icon name="location" size={14} className="text-amber-800" />
            <span>CONSUMO LOCAL — MESA {data.tableNumber}</span>
          </h2>
          <StatusBadge status="CONSUMO_LOCAL" />
        </div>
        <p class="text-xs text-amber-800 font-sans">
          Seu pedido será entregue diretamente na Mesa {data.tableNumber} pelo garçom.
        </p>
      </div>
    {:else}
      <div class="border-2 border-red-600 bg-red-50 p-4 space-y-1">
        <div class="flex items-center justify-between">
          <h2 class="font-mono text-xs font-bold uppercase tracking-widest text-red-900 flex items-center gap-1.5">
            <Icon name="delivery" size={14} className="text-red-600" />
            <span>ENTREGA EM DOMICÍLIO (DELIVERY)</span>
          </h2>
          <StatusBadge status="DELIVERY" />
        </div>
        <p class="text-xs text-red-800 font-sans">
          Entrega estimada em ~{estimatedSlaMinutes} minutos no seu endereço.
        </p>
      </div>
    {/if}

    <!-- 1. Identificação do Cliente CRM -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="1. DADOS DO CLIENTE (CRM)" subtitle="Informe seu nome e WhatsApp para rastrear o pedido" />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Nome Completo" placeholder="Ex: Matheus Vieira" bind:value={customerName} required />
        <FormField label="WhatsApp / Telefone" placeholder="(00) 00000-0000" bind:value={customerPhone} required />
      </div>
    </div>

    <!-- 2. Endereço de Entrega (se Delivery) -->
    {#if !data.isTableFlow}
      <div class="bg-white border border-slate-200 p-4 space-y-3">
        <PanelHeader title="2. ENDEREÇO DE ENTREGA" subtitle="Confirme a rua e bairro para cálculo do frete" />

        <div class="space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <div class="col-span-2">
              <FormField label="Rua / Logradouro" placeholder="Ex: Av. Principal" bind:value={addressStreet} required />
            </div>
            <FormField label="Número" placeholder="299" bind:value={addressNumber} required />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <FormField label="Bairro" placeholder="Bairro" bind:value={addressNeighborhood} required />
            <FormField label="CEP" placeholder="56500-000" bind:value={addressZipCode} />
          </div>

          <FormField label="Ponto de Referência / Complemento" placeholder="Ex: Próximo à praça central" bind:value={addressComplement} />
        </div>
      </div>
    {/if}

    <!-- 3. Cupom de Desconto -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="3. CUPOM DE DESCONTO" subtitle="Possui um código de desconto? Digite abaixo:" />

      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={couponInputCode}
          placeholder="Ex: CARDAP10"
          class="flex-1 p-2 bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 uppercase font-bold tracking-wider focus:outline-none focus:border-red-600"
        />
        <button
          type="button"
          on:click={handleApplyCoupon}
          disabled={couponApplying || !couponInputCode.trim()}
          class="px-4 py-2 bg-slate-900 hover:bg-black text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
        >
          {couponApplying ? 'VALIDANDO...' : 'APLICAR'}
        </button>
      </div>

      {#if couponMessage}
        <div class="p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono text-xs font-bold flex items-center gap-1.5">
          <span>✓</span>
          <span>{couponMessage}</span>
        </div>
      {/if}

      {#if couponError}
        <div class="p-2 bg-red-50 border border-red-300 text-red-800 font-mono text-xs font-bold flex items-center gap-1.5">
          <span>⚠️</span>
          <span>{couponError}</span>
        </div>
      {/if}
    </div>

    <!-- 4. Forma de Pagamento -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="4. FORMA DE PAGAMENTO" subtitle="Escolha como deseja realizar o pagamento" />

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <button
          type="button"
          class="p-3 border text-left flex flex-col justify-between gap-2 cursor-pointer transition-colors {paymentOption === 'PIX' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}"
          on:click={() => paymentOption = 'PIX'}
        >
          <span class="font-mono text-xs font-bold uppercase tracking-wider">PIX Instantâneo</span>
          <span class="text-[10px] text-slate-500 font-sans">Aprovação imediata via QR Code</span>
        </button>

        <button
          type="button"
          class="p-3 border text-left flex flex-col justify-between gap-2 cursor-pointer transition-colors {paymentOption === 'CARTAO_ENTREGA' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}"
          on:click={() => paymentOption = 'CARTAO_ENTREGA'}
        >
          <span class="font-mono text-xs font-bold uppercase tracking-wider">Cartão de Débito/Crédito</span>
          <span class="text-[10px] text-slate-500 font-sans">Maquininha na entrega/mesa</span>
        </button>

        <button
          type="button"
          class="p-3 border text-left flex flex-col justify-between gap-2 cursor-pointer transition-colors {paymentOption === 'DINHEIRO_ENTREGA' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}"
          on:click={() => paymentOption = 'DINHEIRO_ENTREGA'}
        >
          <span class="font-mono text-xs font-bold uppercase tracking-wider">Dinheiro em Espécie</span>
          <span class="text-[10px] text-slate-500 font-sans">Pagamento ao entregador/caixa</span>
        </button>
      </div>
    </div>

    <!-- 5. Resumo e Totais -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="5. RESUMO DOS VALORES" subtitle="Valores calculados e validados pelo servidor" />

      <div class="space-y-1.5 font-mono text-xs border-b border-slate-200 pb-3 text-slate-700">
        <div class="flex justify-between">
          <span>Subtotal dos Itens ({$cartItemCount}):</span>
          <span class="font-bold">{fmt(subtotal)}</span>
        </div>

        {#if discountCents > 0}
          <div class="flex justify-between text-red-600 font-bold">
            <span>Desconto Cupom ({appliedCoupon?.code}):</span>
            <span>- {fmt(discountCents)}</span>
          </div>
        {/if}

        <div class="flex justify-between">
          <span>Taxa de Entrega:</span>
          {#if isFreeDelivery}
            <span class="text-emerald-700 font-bold uppercase">Grátis</span>
          {:else}
            <span class="font-bold">{fmt(deliveryFeeCents)}</span>
          {/if}
        </div>
      </div>

      <div class="flex items-center justify-between font-mono text-base font-bold text-slate-900 pt-1">
        <span>TOTAL FINAL:</span>
        <span class="text-red-600">{fmt(finalTotalCents)}</span>
      </div>
    </div>
  </main>

  <!-- Footer Fixo Brutalista -->
  <footer class="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-slate-900 border-t-2 border-slate-950 p-3 z-40 shadow-2xl">
    <PrimaryButton
      label={isSubmitting ? 'PROCESSANDO...' : `CONFIRMAR PEDIDO (${fmt(finalTotalCents)})`}
      variant="primary"
      shortcut="↵"
      fullWidth
      disabled={isSubmitting || $cartItemCount === 0}
      on:click={handleConfirmOrder}
    />
  </footer>
</div>

{#if isWhatsAppModalOpen && currentOrderPayload}
  <ModalWhatsAppSender
    isOpen={isWhatsAppModalOpen}
    orderDetails={currentOrderPayload}
    onClose={handleOrderSent}
  />
{/if}
