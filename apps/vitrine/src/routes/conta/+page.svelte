<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { tenantVitrineManager } from '$stores/tenantVitrineStore';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PanelHeader from '$components/PanelHeader.svelte';
  import PrimaryButton from '$components/PrimaryButton.svelte';
  import BottomBarNav from '$components/BottomBarNav.svelte';
  import FormField from '$components/FormField.svelte';
  import Icon from '$components/Icon.svelte';
  import { cartItemCount } from '$stores/cartStore';

  const { currentSlug } = tenantVitrineManager;

  let customerName = '';
  let customerPhone = '';
  let customerEmail = '';
  let cpfInput = '';
  let saveSuccess = false;

  interface AddressRecord {
    id: string;
    label: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    isDefault: boolean;
  }

  let addresses: AddressRecord[] = [];

  let newLabel = 'CASA';
  let newStreet = '';
  let newNumber = '';
  let newComplement = '';
  let newNeighborhood = '';
  let newCity = '';
  let showAddAddressModal = false;

  function maskPhone(val: string): string {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  function maskCpf(val: string): string {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  function handlePhoneInput(e: Event) {
    const target = e.target as HTMLInputElement;
    customerPhone = maskPhone(target.value);
  }

  function handleCpfInput(e: Event) {
    const target = e.target as HTMLInputElement;
    cpfInput = maskCpf(target.value);
  }

  onMount(() => {
    try {
      const stored = localStorage.getItem('cardap_user_profile_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) customerName = parsed.name;
        if (parsed.phone) customerPhone = parsed.phone;
        if (parsed.email) customerEmail = parsed.email;
        if (parsed.cpf) cpfInput = parsed.cpf;
        if (parsed.addresses && Array.isArray(parsed.addresses)) {
          addresses = parsed.addresses;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar perfil do localStorage:', e);
    }
  });

  function handleSaveProfile() {
    try {
      const profile = {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        cpf: cpfInput,
        addresses
      };
      localStorage.setItem('cardap_user_profile_v1', JSON.stringify(profile));
      saveSuccess = true;
      setTimeout(() => saveSuccess = false, 3500);
    } catch (e) {
      console.error('Erro ao salvar perfil no localStorage:', e);
    }
  }

  function handleAddAddress() {
    if (!newStreet.trim() || !newNumber.trim()) return;
    const newAddr: AddressRecord = {
      id: `addr-${Date.now()}`,
      label: newLabel.toUpperCase() || 'ENDEREÇO',
      street: newStreet.trim(),
      number: newNumber.trim(),
      complement: newComplement.trim(),
      neighborhood: newNeighborhood.trim() || 'Centro',
      city: newCity.trim(),
      isDefault: addresses.length === 0
    };
    addresses = [...addresses, newAddr];
    newStreet = '';
    newNumber = '';
    newComplement = '';
    newNeighborhood = '';
    newCity = '';
    showAddAddressModal = false;
    handleSaveProfile();
  }

  function handleRemoveAddress(id: string) {
    addresses = addresses.filter(a => a.id !== id);
    if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
      addresses[0].isDefault = true;
    }
    handleSaveProfile();
  }

  function handleSetDefaultAddress(id: string) {
    addresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    handleSaveProfile();
  }
</script>

<div
  in:fly={{ y: 8, duration: 280, easing: cubicOut }}
  class="max-w-2xl mx-auto min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col justify-between relative text-slate-900 pb-16 font-sans"
>
  <!-- Header Fixo da Tela -->
  <header class="bg-slate-900 text-white p-4 space-y-1 sticky top-0 z-30 border-b border-slate-800 backdrop-blur-md bg-slate-900/95">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          on:click={() => goto(`/${$currentSlug}`)}
          class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Icon name="arrow-left" size={12} />
          <span>CARDÁPIO</span>
        </button>
        <div>
          <h1 class="font-mono text-xs font-bold tracking-widest uppercase text-white leading-tight">
            MINHA CONTA & PERFIL
          </h1>
          <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
            DADOS PESSOAIS & ENDEREÇOS SALVOS
          </span>
        </div>
      </div>
    </div>
  </header>

  <main class="p-4 space-y-5 flex-1 pb-20">
    <!-- Feedback de Sucesso -->
    {#if saveSuccess}
      <div
        in:fade={{ duration: 180 }}
        class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-900 uppercase flex items-center gap-2 shadow-xs"
      >
        <Icon name="check" size={16} className="text-emerald-700" />
        <span>DADOS DE PERFIL E ENDEREÇO SALVOS COM SUCESSO!</span>
      </div>
    {/if}

    <!-- Seção 1: Dados Pessoais -->
    <div class="border border-slate-200 bg-white">
      <PanelHeader
        title="Dados Pessoais do Cliente"
        subtitle="Preencha suas informações para preenchimento rápido no checkout"
        index="01"
      />

      <div class="p-4 space-y-3">
        <FormField
          label="Nome Completo:"
          name="name"
          type="text"
          bind:value={customerName}
          placeholder="Seu nome completo"
          required
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label for="custPhoneInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
              WhatsApp / Celular: <span class="text-red-600">*</span>
            </label>
            <input
              id="custPhoneInput"
              type="tel"
              value={customerPhone}
              on:input={handlePhoneInput}
              placeholder="(87) 99999-8888"
              class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label for="custCpfInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
              CPF na Nota (Opcional):
            </label>
            <input
              id="custCpfInput"
              type="text"
              value={cpfInput}
              on:input={handleCpfInput}
              placeholder="000.000.000-00"
              class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        <FormField
          label="E-mail de Contato (Opcional):"
          name="email"
          type="email"
          bind:value={customerEmail}
          placeholder="seuemail@exemplo.com"
        />

        <div class="pt-2 flex justify-end">
          <PrimaryButton
            label="SALVAR DADOS DO PERFIL"
            variant="primary"
            shortcut="↵"
            on:click={handleSaveProfile}
          />
        </div>
      </div>
    </div>

    <!-- Seção 2: Endereços Cadastrados -->
    <div class="border border-slate-200 bg-white">
      <PanelHeader
        title="Endereços de Entrega Salvos"
        subtitle="Endereços memorizados no dispositivo para agilizar seus pedidos"
        index="02"
      />

      <div class="p-4 space-y-3">
        {#if addresses.length > 0}
          {#each addresses as addr (addr.id)}
            <div class="border p-3.5 space-y-1.5 transition-colors {addr.isDefault ? 'bg-red-50/50 border-red-600' : 'bg-slate-50 border-slate-200'}">
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Icon name="map-pin" size={14} className="text-red-600" />
                  <span>{addr.label}</span>
                </span>

                <div class="flex items-center gap-2">
                  {#if addr.isDefault}
                    <span class="px-2 py-0.5 bg-red-600 text-white font-mono text-[9px] font-bold uppercase">
                      PADRÃO
                    </span>
                  {:else}
                    <button
                      type="button"
                      on:click={() => handleSetDefaultAddress(addr.id)}
                      class="font-mono text-[10px] text-slate-600 hover:text-slate-900 underline font-bold uppercase cursor-pointer"
                    >
                      TORNAR PADRÃO
                    </button>
                  {/if}

                  <button
                    type="button"
                    on:click={() => handleRemoveAddress(addr.id)}
                    class="text-slate-400 hover:text-red-600 text-xs font-bold px-1 cursor-pointer"
                    title="Excluir endereço"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <p class="font-mono text-xs font-bold text-slate-900">
                {addr.street}, {addr.number} {#if addr.complement}({addr.complement}){/if}
              </p>
              <p class="text-xs text-slate-600 font-sans">
                Bairro {addr.neighborhood} — {addr.city}
              </p>
            </div>
          {/each}
        {:else}
          <div class="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-300 space-y-1">
            <Icon name="map-pin" size={24} className="mx-auto text-slate-400" />
            <p>Nenhum endereço cadastrado ainda.</p>
            <p class="text-[11px] text-slate-400 font-sans">Cadastre seu endereço para preencher o checkout em 1 clique.</p>
          </div>
        {/if}

        {#if showAddAddressModal}
          <div class="border border-slate-300 bg-slate-50 p-4 space-y-3 font-mono text-xs shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <span class="font-bold text-slate-900 uppercase">NOVO ENDEREÇO DE ENTREGA</span>
              <button type="button" on:click={() => showAddAddressModal = false} class="text-slate-400 hover:text-slate-900 font-bold">✕</button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <FormField label="Identificação (Ex: Casa, Trabalho):" name="label" bind:value={newLabel} />
              <FormField label="Bairro:" name="neighborhood" bind:value={newNeighborhood} placeholder="Ex: Centro" required />
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div class="col-span-2">
                <FormField label="Rua / Avenida:" name="street" bind:value={newStreet} placeholder="Ex: Rua das Palmeiras" required />
              </div>
              <FormField label="Número:" name="number" bind:value={newNumber} placeholder="123" required />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <FormField label="Cidade / UF:" name="city" bind:value={newCity} placeholder="Ex: São Paulo / SP" />
              <FormField label="Complemento / Ref:" name="complement" bind:value={newComplement} placeholder="Ex: Apto 102" />
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                on:click={() => showAddAddressModal = false}
                class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold uppercase cursor-pointer"
              >
                CANCELAR
              </button>
              <PrimaryButton
                label="SALVAR ENDEREÇO"
                variant="primary"
                shortcut="↵"
                on:click={handleAddAddress}
              />
            </div>
          </div>
        {:else}
          <button
            type="button"
            on:click={() => showAddAddressModal = true}
            class="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-slate-400 font-mono text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>+ ADICIONAR NOVO ENDEREÇO</span>
          </button>
        {/if}
      </div>
    </div>
  </main>

  <!-- Rodapé Fixo de Navegação -->
  <div class="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50">
    <BottomBarNav
      activeTab="conta"
      cartCount={$cartItemCount}
    />
  </div>
</div>
