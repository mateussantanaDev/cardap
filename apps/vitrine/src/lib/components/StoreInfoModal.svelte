<script lang="ts">
  import Modal from './Modal.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import PrimaryButton from './PrimaryButton.svelte';
  import Icon from './Icon.svelte';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};

  const storeDetails = {
    name: 'Restaurante & Hamburgueria',
    cnpj: '48.912.345/0001-90',
    rating: '4.9 ★ (1.820 avaliações)',
    address: 'Av. Principal, 100 — Centro',
    minOrderCents: 1100,
    deliveryFeeCents: 500,
    phone: '(87) 99641-0495',
    hours: [
      { day: 'Segunda-feira', time: '17:00 às 23:30', isOpen: true },
      { day: 'Terça-feira', time: '17:00 às 23:30', isOpen: true },
      { day: 'Quarta-feira', time: '17:00 às 23:30', isOpen: true },
      { day: 'Quinta-feira', time: '17:00 às 23:30', isOpen: true },
      { day: 'Sexta-feira', time: '17:00 às 00:30', isOpen: true },
      { day: 'Sábado', time: '17:00 às 00:30', isOpen: true },
      { day: 'Domingo', time: '17:00 às 23:00', isOpen: true }
    ],
    paymentMethods: [
      'PIX Instantâneo (Com Desconto)',
      'Cartão de Crédito (Visa, Mastercard, Elo)',
      'Cartão de Débito',
      'Dinheiro na Entrega'
    ]
  };

  const fmt = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
</script>

<Modal
  {isOpen}
  {onClose}
  title="INFORMAÇÕES DA LOJA & HORÁRIOS"
  subtitle="Dados institucionais e grade de atendimento"
  maxWidth="md"
>
  <div class="space-y-4 font-sans text-xs text-slate-800">
    <!-- Header com Status -->
    <div class="border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
      <div>
        <h4 class="font-mono text-xs font-bold uppercase text-slate-900">{storeDetails.name}</h4>
        <span class="font-mono text-[10px] text-amber-700 font-bold block mt-0.5">{storeDetails.rating}</span>
      </div>
      <StatusBadge status="ABERTO" />
    </div>

    <!-- Tabela de Horários de Funcionamento -->
    <div class="border border-slate-200">
      <div class="bg-slate-100 border-b border-slate-200 px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase text-slate-600 flex items-center gap-1.5">
        <Icon name="calendar" size={14} className="text-slate-600" />
        <span>HORÁRIOS DE ATENDIMENTO</span>
      </div>
      <div class="divide-y divide-slate-100 font-mono text-xs bg-white">
        {#each storeDetails.hours as h}
          <div class="px-3 py-2 flex items-center justify-between">
            <span class="font-bold text-slate-800">{h.day}:</span>
            <span class="text-slate-600">{h.time}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Informações Operacionais -->
    <div class="border border-slate-200 bg-slate-50 p-3 space-y-2 font-mono text-xs">
      <div class="flex justify-between border-b border-slate-200 pb-1.5">
        <span class="text-slate-500 uppercase">PEDIDO MÍNIMO:</span>
        <span class="font-bold text-slate-900">{fmt(storeDetails.minOrderCents)}</span>
      </div>
      <div class="flex justify-between border-b border-slate-200 pb-1.5">
        <span class="text-slate-500 uppercase">TAXA DE ENTREGA:</span>
        <span class="font-bold text-slate-900">{fmt(storeDetails.deliveryFeeCents)}</span>
      </div>
      <div class="flex justify-between border-b border-slate-200 pb-1.5">
        <span class="text-slate-500 uppercase">ENDEREÇO:</span>
        <span class="font-sans text-[11px] text-slate-700 text-right">{storeDetails.address}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-500 uppercase">WHATSAPP:</span>
        <span class="text-red-600 font-bold">{storeDetails.phone}</span>
      </div>
    </div>

    <!-- Formas de Pagamento Aceitas -->
    <div class="border border-slate-200">
      <div class="bg-slate-100 border-b border-slate-200 px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase text-slate-600 flex items-center gap-1.5">
        <Icon name="credit-card" size={14} className="text-slate-600" />
        <span>FORMAS DE PAGAMENTO ACEITAS</span>
      </div>
      <ul class="p-3 space-y-1 font-mono text-[11px] text-slate-700 list-disc pl-5 bg-white">
        {#each storeDetails.paymentMethods as pay}
          <li>{pay}</li>
        {/each}
      </ul>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton
      label="FECHAR"
      variant="secondary"
      shortcut="Esc"
      on:click={onClose}
    />
  </svelte:fragment>
</Modal>
