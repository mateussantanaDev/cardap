<script lang="ts">
  import { onMount } from 'svelte';
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
  import { tableSessionStore, isTableMode as isStoreTableMode, tableNumber as storeTableNumber } from '$stores/tableSessionStore';

  export let data: PageData;

  const { currentSlug } = tenantVitrineManager;

  $: activeRestaurant = data.restaurant || tenantVitrineManager.getTenant($currentSlug);
  $: restaurantName = activeRestaurant?.name || 'Imperius do Pastel';
  $: restaurantWhatsApp = activeRestaurant?.phone || '(87) 9 9603-6770';
  $: restaurantSlug = activeRestaurant?.slug || $currentSlug;

  // Modalidade de Atendimento — Salão se veio por QR Code (ou URL ou Store)
  $: isEffectiveTableMode = data.isTableFlow || $isStoreTableMode;
  $: effectiveTableNumber = data.tableNumber || $storeTableNumber;

  let deliveryMode: 'DELIVERY' | 'RETIRADA' | 'SALAO' = 'DELIVERY';
  let tableNumberInput = '';

  $: if (isEffectiveTableMode) {
    deliveryMode = 'SALAO';
    if (effectiveTableNumber) {
      tableNumberInput = String(effectiveTableNumber);
    }
  } else if (data.isTableFlow) {
    deliveryMode = 'SALAO';
    tableNumberInput = data.tableNumber ? String(data.tableNumber) : '';
  }

  // State do formulário do cliente
  let customerName = '';
  let customerPhone = '';
  let addressStreet = '';
  let addressNumber = '';
  let addressNeighborhood = 'Centro';
  let addressComplement = '';
  let addressZipCode = '55295-000';
  let orderNotes = '';

  // Pagamento
  let paymentOption: 'PIX' | 'DINHEIRO_ENTREGA' | 'CARTAO_ENTREGA' = 'PIX';
  let cardBrandType = 'CARTAO_CREDITO'; // ou 'CARTAO_DEBITO'
  let needsChange = false;
  let changeForAmount = '';
  let copiedPix = false;

  // Cupom de Desconto
  let couponInputCode = '';
  let couponApplying = false;
  let couponMessage = '';
  let couponError = '';
  let appliedCoupon: any = null;
  let discountCents = 0;

  // Erros de Validação
  let validationError = '';
  let isSubmitting = false;
  let isWhatsAppModalOpen = false;
  let currentOrderPayload: any = null;

  function maskPhone(val: string): string {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  function handlePhoneInput(e: Event) {
    const target = e.target as HTMLInputElement;
    customerPhone = maskPhone(target.value);
  }

  // Preenchimento automático do Perfil Salvo
  onMount(() => {
    try {
      const stored = localStorage.getItem('cardap_user_profile_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) customerName = parsed.name;
        if (parsed.phone) customerPhone = parsed.phone;

        if (parsed.addresses && Array.isArray(parsed.addresses) && parsed.addresses.length > 0) {
          const defaultAddr = parsed.addresses.find((a: any) => a.isDefault) || parsed.addresses[0];
          if (defaultAddr) {
            addressStreet = defaultAddr.street || '';
            addressNumber = defaultAddr.number || '';
            addressNeighborhood = defaultAddr.neighborhood || 'Centro';
            addressComplement = defaultAddr.complement || '';
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do usuário:', e);
    }
  });

  // Cálculo de Frete e Totais
  $: baseDeliveryFee = deliveryMode === 'DELIVERY'
    ? (typeof activeRestaurant?.deliveryFeeCents === 'number' ? activeRestaurant.deliveryFeeCents : 0)
    : 0;
  $: isFreeDeliveryCoupon = appliedCoupon?.discountType === 'ENTREGA_GRATIS';
  $: deliveryFeeCents = isFreeDeliveryCoupon ? 0 : baseDeliveryFee;
  $: subtotal = $cartSubtotalCents;
  $: finalTotalCents = Math.max(0, subtotal - (isFreeDeliveryCoupon ? 0 : discountCents) + deliveryFeeCents);

  const fmt = (cents: number) => {
    const valid = (cents !== undefined && cents !== null && !isNaN(cents)) ? Number(cents) : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valid / 100);
  };

  function handleCopyPixKey(key: string) {
    navigator.clipboard.writeText(key);
    copiedPix = true;
    setTimeout(() => copiedPix = false, 2500);
  }

  // Aplicar Cupom de Desconto
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
          code: couponInputCode.trim().toUpperCase(),
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

  // Validação Estrita do Checkout
  function validateOrder(): boolean {
    validationError = '';

    if ($cartStore.length === 0) {
      validationError = 'Sua sacola está vazia. Adicione itens antes de finalizar.';
      return false;
    }

    if (!customerName.trim()) {
      validationError = 'Por favor, informe seu Nome Completo.';
      return false;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      validationError = 'Por favor, informe um WhatsApp válido com DDD.';
      return false;
    }

    if (deliveryMode === 'DELIVERY') {
      if (!addressStreet.trim() || !addressNumber.trim() || !addressNeighborhood.trim()) {
        validationError = 'Para entrega em domicílio, informe a Rua, Número e Bairro.';
        return false;
      }
    }

    if (deliveryMode === 'SALAO' && !tableNumberInput.trim()) {
      validationError = 'Para consumo no salão, informe o número da sua Mesa.';
      return false;
    }

    if (paymentOption === 'DINHEIRO_ENTREGA' && needsChange) {
      const trocoCents = Math.round(parseFloat((changeForAmount || '0').replace(',', '.')) * 100);
      if (isNaN(trocoCents) || trocoCents < finalTotalCents) {
        validationError = `O valor para troco deve ser maior ou igual ao total do pedido (${fmt(finalTotalCents)}).`;
        return false;
      }
    }

    const minOrder = activeRestaurant?.minOrderCents || 0;
    if (deliveryMode === 'DELIVERY' && subtotal < minOrder) {
      validationError = `O pedido mínimo para entrega é de ${fmt(minOrder)}. Subtotal atual: ${fmt(subtotal)}.`;
      return false;
    }

    return true;
  }

  // Confirmar Pedido
  async function handleConfirmOrder() {
    if (!validateOrder() || isSubmitting) return;

    isSubmitting = true;
    validationError = '';

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: deliveryMode,
          isTableFlow: isEffectiveTableMode,
          token: data.rawToken || $tableSessionStore.token || undefined,
          tableNumber: deliveryMode === 'SALAO' ? (parseInt(tableNumberInput) || effectiveTableNumber || 1) : undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          addressStreet: deliveryMode === 'DELIVERY' ? addressStreet.trim() : undefined,
          addressNumber: deliveryMode === 'DELIVERY' ? addressNumber.trim() : undefined,
          addressNeighborhood: deliveryMode === 'DELIVERY' ? addressNeighborhood.trim() : undefined,
          addressComplement: deliveryMode === 'DELIVERY' ? addressComplement.trim() : undefined,
          addressZipCode: deliveryMode === 'DELIVERY' ? addressZipCode.trim() : undefined,
          paymentOption,
          subtotalCents: subtotal,
          discountCents,
          deliveryFeeCents,
          totalCents: finalTotalCents,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          notes: orderNotes.trim(),
          items: $cartStore.map(item => ({
            productId: item.productId,
            productName: item.productName,
            basePriceCents: item.basePriceCents,
            quantity: item.quantity,
            selectedAssemblies: item.selectedAssemblies || [],
            selectedModifiers: item.selectedModifiers || [],
            selectedComplements: item.selectedComplements || [],
            itemTotalCents: item.itemTotalCents || (item.basePriceCents * item.quantity),
            notes: item.notes
          }))
        })
      });

      const orderData = await response.json();
      if (!orderData.success && orderData.error) {
        validationError = orderData.error;
        isSubmitting = false;
        return;
      }

      const orderId = orderData.orderId || `${Math.floor(40000 + Math.random() * 9000)}`;

      const now = new Date();
      now.setMinutes(now.getMinutes() + 35);
      const estimatedTime = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

      const paymentLabel = paymentOption === 'PIX'
        ? 'PIX Instantâneo'
        : paymentOption === 'CARTAO_ENTREGA'
        ? (cardBrandType === 'CARTAO_DEBITO' ? 'Cartão de Débito' : 'Cartão de Crédito')
        : (needsChange && changeForAmount ? `Dinheiro (Troco para R$ ${changeForAmount})` : 'Dinheiro (Sem troco)');

      const deliveryLabel = deliveryMode === 'DELIVERY'
        ? 'Delivery em Domicílio'
        : deliveryMode === 'RETIRADA'
        ? 'Retirada no Balcão'
        : `Consumo no Local (Mesa ${tableNumberInput || data.tableNumber || '1'})`;

      const fullAddress = deliveryMode === 'DELIVERY'
        ? `${addressNeighborhood}, ${addressStreet}, ${addressNumber}${addressComplement ? `, ${addressComplement}` : ''}`
        : deliveryLabel;

      const formattedItems = $cartStore.map(i => {
        const totalAsm = i.selectedAssemblies ? i.selectedAssemblies.length : 0;
        const subItems = totalAsm > 0
          ? i.selectedAssemblies.map(a => ({
              label: totalAsm === 1 ? '1/1' : `1/${totalAsm}`,
              name: a.name
            }))
          : undefined;

        return {
          name: i.productName,
          qty: i.quantity,
          priceFormatted: fmt(i.basePriceCents * i.quantity),
          subItems,
          obs: i.notes || undefined
        };
      });

      currentOrderPayload = {
        restaurantName,
        orderId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryType: deliveryLabel,
        estimatedTime,
        paymentName: paymentLabel,
        fullAddress,
        orderNotes: orderNotes.trim() || undefined,
        items: formattedItems,
        subtotalFormatted: fmt(subtotal),
        deliveryFeeFormatted: deliveryFeeCents > 0 ? fmt(deliveryFeeCents) : 'Grátis',
        totalFormatted: fmt(finalTotalCents),
        statusUrl: `https://app.cardaperp.com.br/${restaurantSlug}/status/${orderId}`
      };

      isWhatsAppModalOpen = true;
    } catch (err: any) {
      validationError = 'Erro ao processar o pedido. Tente novamente.';
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
        customerName: currentOrderPayload.customerName || customerName.trim() || 'Cliente',
        date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        type: deliveryMode,
        itemsSummary: itemsSummary || 'Itens selecionados',
        totalCents: finalTotalCents,
        status: 'RECEBIDO',
        rawItems: $cartStore
      };
      localStorage.setItem('cardap_user_orders_v1', JSON.stringify([newRecord, ...orders]));
    } catch (e) {
      console.error('Erro ao salvar pedido no histórico:', e);
    }

    if (isEffectiveTableMode) {
      for (const item of $cartStore) {
        tableSessionStore.addComandaItem({
          name: item.productName,
          qty: item.quantity,
          priceFormatted: fmt(item.itemTotalCents),
          notes: item.notes
        }, item.itemTotalCents);
      }
    }

    cartStore.clearCart();
    isWhatsAppModalOpen = false;
    goto(`/status/${id}?type=${deliveryMode}&table=${tableNumberInput || ''}`);
  }
</script>

<svelte:head>
  <title>Finalizar Pedido — Carrinho & Pagamento Seguro | {restaurantName}</title>
  <meta name="description" content="Finalize seu pedido com segurança via PIX, Cartão ou Dinheiro." />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900 font-sans">
  
  <!-- Header Institucional -->
  <header class="bg-slate-900 text-white p-4 space-y-1 sticky top-0 z-30 border-b border-slate-800 backdrop-blur-md bg-slate-900/95">
    <div class="flex items-center gap-3">
      <button
        type="button"
        on:click={() => goto(`/${restaurantSlug}`)}
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
          {restaurantName.toUpperCase()} · CONSOLIDAÇÃO DA SACOLA
        </span>
      </div>
    </div>
  </header>

  <main class="p-4 space-y-4 flex-1 pb-28">
    <!-- Alerta de Erro de Validação -->
    {#if validationError}
      <div class="border-2 border-red-600 bg-red-50 p-3.5 font-mono text-xs font-bold text-red-900 uppercase flex items-center gap-2 shadow-xs">
        <span class="text-base">⚠️</span>
        <span>{validationError}</span>
      </div>
    {/if}

    <!-- 1. Modalidade de Atendimento -->
    {#if !isEffectiveTableMode}
      <div class="bg-white border border-slate-200 p-4 space-y-3">
        <PanelHeader title="1. FORMA DE ENTREGA / ATENDIMENTO" subtitle="Escolha como deseja receber seus itens" />

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="p-3 border text-center flex flex-col items-center gap-1.5 cursor-pointer transition-colors {deliveryMode === 'DELIVERY' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
            on:click={() => deliveryMode = 'DELIVERY'}
          >
            <Icon name="delivery" size={20} className={deliveryMode === 'DELIVERY' ? 'text-red-600' : 'text-slate-600'} />
            <span class="font-mono text-xs uppercase">DELIVERY</span>
            <span class="text-[9px] font-mono text-slate-500 font-normal">No seu endereço</span>
          </button>

          <button
            type="button"
            class="p-3 border text-center flex flex-col items-center gap-1.5 cursor-pointer transition-colors {deliveryMode === 'RETIRADA' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
            on:click={() => deliveryMode = 'RETIRADA'}
          >
            <Icon name="store" size={20} className={deliveryMode === 'RETIRADA' ? 'text-red-600' : 'text-slate-600'} />
            <span class="font-mono text-xs uppercase">RETIRADA</span>
            <span class="text-[9px] font-mono text-emerald-700 font-bold">Sem taxa</span>
          </button>
        </div>
      </div>
    {:else}
      <!-- Autoatendimento via QR Code na Mesa (Delivery Desativado) -->
      <div class="border-2 border-amber-500 bg-amber-50 p-4 space-y-2 shadow-xs font-mono">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-extrabold uppercase tracking-widest text-amber-950 flex items-center gap-2">
            <div class="w-6 h-6 bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
              {effectiveTableNumber}
            </div>
            <span>AUTOATENDIMENTO — MESA {effectiveTableNumber}</span>
          </h2>
          <span class="px-2 py-0.5 bg-slate-950 text-amber-400 text-[9px] font-bold uppercase">
            QR CODE ATIVO
          </span>
        </div>

        <div class="p-3 bg-white border border-amber-300 text-xs text-slate-800 space-y-1.5 font-mono">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Modalidade:</span>
            <strong class="text-slate-900 uppercase">Consumo Presencial (Salão)</strong>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Taxa de Entrega:</span>
            <strong class="text-emerald-700 uppercase">Isento / Grátis (R$ 0,00)</strong>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Destino do Pedido:</span>
            <strong class="text-red-600 uppercase">Cozinha KDS & Comanda Mesa {effectiveTableNumber}</strong>
          </div>
        </div>

        <p class="text-[11px] text-amber-900 font-sans leading-tight">
          🛵 <em>Delivery desativado automaticamente pois você está em atendimento presencial na mesa.</em>
        </p>
      </div>
    {/if}

    <!-- 2. Identificação do Cliente -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="2. SEUS DADOS DE CONTATO" subtitle="Identificação para o preparo e atualizações do pedido" />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Nome Completo:" name="name" placeholder="Ex: João da Silva" bind:value={customerName} required />
        
        <div>
          <label for="checkoutPhoneInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
            WhatsApp com DDD: <span class="text-red-600">*</span>
          </label>
          <input
            id="checkoutPhoneInput"
            type="tel"
            value={customerPhone}
            on:input={handlePhoneInput}
            placeholder="(11) 99999-9999"
            class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
      </div>
    </div>

    <!-- 3. Endereço de Entrega (Apenas se Delivery) -->
    {#if deliveryMode === 'DELIVERY'}
      <div class="bg-white border border-slate-200 p-4 space-y-3">
        <PanelHeader title="3. ENDEREÇO DE ENTREGA" subtitle="Onde você deseja receber seu pedido?" />

        <div class="space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <div class="col-span-2">
              <FormField label="Rua / Avenida:" name="street" placeholder="Ex: Rua das Flores" bind:value={addressStreet} required />
            </div>
            <FormField label="Número:" name="number" placeholder="123" bind:value={addressNumber} required />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <FormField label="Bairro:" name="neighborhood" placeholder="Centro" bind:value={addressNeighborhood} required />
            <FormField label="CEP:" name="zipCode" placeholder="01001-000" bind:value={addressZipCode} />
          </div>

          <FormField
            label="Ponto de Referência / Complemento:"
            name="complement"
            placeholder="Ex: Apto 42 / Próximo à praça"
            bind:value={addressComplement}
          />
        </div>
      </div>
    {/if}

    <!-- 4. Cupom de Desconto -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="4. CUPOM DE DESCONTO" subtitle="Possui um código de desconto? Aplique aqui" />

      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={couponInputCode}
          placeholder="Ex: ESPANKA10"
          class="flex-1 p-2 bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 uppercase font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-red-600"
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

    <!-- 5. Forma de Pagamento -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="5. FORMA DE PAGAMENTO" subtitle="Escolha como deseja realizar o pagamento" />

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <button
          type="button"
          class="p-3 border text-left flex flex-col justify-between gap-1.5 cursor-pointer transition-colors {paymentOption === 'PIX' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
          on:click={() => paymentOption = 'PIX'}
        >
          <span class="font-mono text-xs font-bold uppercase tracking-wider">PIX Instantâneo</span>
          <span class="text-[10px] text-slate-500 font-sans">Aprovação rápida</span>
        </button>

        <button
          type="button"
          class="p-3 border text-left flex flex-col justify-between gap-1.5 cursor-pointer transition-colors {paymentOption === 'CARTAO_ENTREGA' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
          on:click={() => paymentOption = 'CARTAO_ENTREGA'}
        >
          <span class="font-mono text-xs font-bold uppercase tracking-wider">Cartão na Entrega</span>
          <span class="text-[10px] text-slate-500 font-sans">Maquininha</span>
        </button>

        <button
          type="button"
          class="p-3 border text-left flex flex-col justify-between gap-1.5 cursor-pointer transition-colors {paymentOption === 'DINHEIRO_ENTREGA' ? 'bg-red-50 border-red-600 text-red-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
          on:click={() => paymentOption = 'DINHEIRO_ENTREGA'}
        >
          <span class="font-mono text-xs font-bold uppercase tracking-wider">Dinheiro em Espécie</span>
          <span class="text-[10px] text-slate-500 font-sans">Com ou sem troco</span>
        </button>
      </div>

      <!-- Detalhes do PIX Manual se configurado -->
      {#if paymentOption === 'PIX' && activeRestaurant?.pixKey}
        <div class="p-3.5 bg-emerald-50 border border-emerald-300 font-mono text-xs space-y-2 text-emerald-950">
          <div class="flex items-center justify-between">
            <span class="font-bold uppercase tracking-wider">CHAVE PIX DO ESTABELECIMENTO ({activeRestaurant.pixKeyType}):</span>
            <button
              type="button"
              on:click={() => handleCopyPixKey(activeRestaurant.pixKey)}
              class="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] cursor-pointer"
            >
              {copiedPix ? '✓ COPIADA!' : 'COPIAR CHAVE'}
            </button>
          </div>
          <div class="bg-white p-2 border border-emerald-300 font-bold text-slate-900 break-all">
            {activeRestaurant.pixKey}
          </div>
          {#if activeRestaurant.pixReceiverName}
            <div class="text-[11px] text-emerald-900 font-sans">
              <strong>Favorecido:</strong> {activeRestaurant.pixReceiverName} {#if activeRestaurant.pixReceiverCity}({activeRestaurant.pixReceiverCity}){/if}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Opção de Troco no Dinheiro -->
      {#if paymentOption === 'DINHEIRO_ENTREGA'}
        <div class="p-3.5 bg-slate-50 border border-slate-200 space-y-2.5 font-mono text-xs">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="needsChangeGroup" checked={!needsChange} on:change={() => needsChange = false} class="accent-red-600" />
              <span>Não preciso de troco</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="needsChangeGroup" checked={needsChange} on:change={() => needsChange = true} class="accent-red-600" />
              <span>Preciso de troco</span>
            </label>
          </div>

          {#if needsChange}
            <FormField
              label="Troco para quanto? (R$)"
              name="changeFor"
              type="text"
              placeholder="Ex: 50,00"
              bind:value={changeForAmount}
              mono
              required
            />
          {/if}
        </div>
      {/if}

      <!-- Opção de Bandeira do Cartão -->
      {#if paymentOption === 'CARTAO_ENTREGA'}
        <div class="p-3 bg-slate-50 border border-slate-200 flex gap-4 font-mono text-xs">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="cardType" value="CARTAO_CREDITO" bind:group={cardBrandType} class="accent-red-600" />
            <span>Crédito</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="cardType" value="CARTAO_DEBITO" bind:group={cardBrandType} class="accent-red-600" />
            <span>Débito</span>
          </label>
        </div>
      {/if}

      <!-- Observações Gerais -->
      <div class="pt-2">
        <FormField
          label="Observações do Pedido / Instruções Especiais:"
          name="notes"
          placeholder="Ex: Primeira esquina à esquerda após o armazém da petronios e segunda à direita"
          bind:value={orderNotes}
        />
      </div>
    </div>

    <!-- 6. Resumo e Totais -->
    <div class="bg-white border border-slate-200 p-4 space-y-3">
      <PanelHeader title="6. RESUMO DOS VALORES" subtitle="Valores consolidados pelo sistema" />

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
          {#if deliveryFeeCents === 0}
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

<!-- Modal WhatsApp para Abertura e Notificação do Pedido -->
{#if isWhatsAppModalOpen && currentOrderPayload}
  <ModalWhatsAppSender
    isOpen={isWhatsAppModalOpen}
    orderDetails={currentOrderPayload}
    restaurantWhatsApp={restaurantWhatsApp}
    onClose={handleOrderSent}
    onSent={handleOrderSent}
  />
{/if}
