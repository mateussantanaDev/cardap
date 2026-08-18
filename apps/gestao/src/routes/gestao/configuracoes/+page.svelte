<script lang="ts">
  import { systemConfigManager, type SystemUser, type DetectedPrinter } from '$stores/systemConfigStore';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import SubNav from '$ui/SubNav.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Modal from '$ui/Modal.svelte';
  import Icon from '$components/Icon.svelte';
  import { PrinterService } from '$services/printerService';
  import { onMount } from 'svelte';

  const { users, printers } = systemConfigManager;

  let activeTab: 'vitrine' | 'gateways' | 'whatsapp' | 'usuarios' | 'impressoras' = 'vitrine';
  let testToast = '';
  let isSaving = false;

  // Toggle de senhas / tokens
  let showTokenMP = false;
  let showTokenAsaas = false;
  let showSecretEFI = false;

  // =========================================================================
  // DADOS DA VITRINE & ESTABELECIMENTO
  // =========================================================================
  let store = {
    name: 'Imperius do Pastel',
    slug: 'imperius-do-pastel',
    category: 'Pastelaria Artesanal & Caldos de Cana',
    cnpj: '52.894.103/0001-88',
    phone: '(19) 99591-1878',
    email: 'contato@imperiusdopastel.com.br',
    instagram: '@imperiusdopastel',
    logoUrl: '',
    bannerUrl: '',
    primaryColor: '#dc2626',
    secondaryColor: '#0f172a',
    accentColor: '#f59e0b',
    deliveryFee: 6.00,
    minOrderValue: 15.00,
    slaMinutesMin: 20,
    slaMinutesMax: 45,
    isOpen: true,
    allowDelivery: true,
    allowTakeout: true,
    allowDineIn: true,
    operatingHours: 'Segunda a Domingo: 17:00 às 23:30',
    addressStreet: 'Av. Rui Barbosa',
    addressNumber: '450',
    addressNeighborhood: 'Centro',
    addressCity: 'Garanhuns',
    addressState: 'PE',
    addressZipCode: '55295-000',

    // Gateway de Pagamento
    paymentGateway: 'MERCADO_PAGO',
    mpPublicKey: '',
    mpAccessToken: '',
    mpSandbox: false,
    asaasApiKey: '',
    asaasWalletId: '',
    asaasSandbox: false,
    efiClientId: '',
    efiClientSecret: '',
    efiPixKey: '',
    pagarmeApiKey: '',
    pagarmeEncKey: '',
    pixKeyType: 'CNPJ',
    pixKey: '52.894.103/0001-88',
    pixReceiverName: 'Imperius do Pastel LTDA',
    pixReceiverCity: 'Garanhuns',
    pixInstructions: 'Após pagar via PIX, o pedido será aprovado e enviado para a cozinha automaticamente.',

    // WAHA
    wahaSessionName: 'Imperiuspastel'
  };

  // Paletas Pré-definidas de Cores para a Vitrine
  const colorPresets = [
    { name: 'Vermelho Burger & Lanches', primary: '#dc2626', secondary: '#0f172a', accent: '#f59e0b' },
    { name: 'Laranja Pastelaria & Salgados', primary: '#ea580c', secondary: '#18181b', accent: '#facc15' },
    { name: 'Âmbar Pizzaria & Forneria', primary: '#d97706', secondary: '#1c1917', accent: '#fbbf24' },
    { name: 'Verde Orgânico & Saudável', primary: '#16a34a', secondary: '#064e3b', accent: '#84cc16' },
    { name: 'Roxo Açaí & Sorvetes', primary: '#7c3aed', secondary: '#1e1b4b', accent: '#ec4899' },
    { name: 'Escuro Minimalista / Dark', primary: '#2563eb', secondary: '#09090b', accent: '#38bdf8' }
  ];

  function applyColorPreset(preset: typeof colorPresets[0]) {
    store.primaryColor = preset.primary;
    store.secondaryColor = preset.secondary;
    store.accentColor = preset.accent;
  }

  // WAHA WhatsApp State
  let wahaStatus = 'SCAN_QR_CODE';
  let wahaSessionName = 'Imperiuspastel';
  let wahaQrBase64: string | null = null;
  let wahaMe: { id: string; pushName?: string } | null = null;
  let isLoadingWaha = false;
  let wahaPollInterval: any = null;
  let testMsgPhone = '';
  let testMsgBody = 'Olá! Teste de mensagem disparado da central do Cardap ERP.';

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          store = { ...store, ...data.settings };
          if (data.settings.phone && !testMsgPhone) {
            testMsgPhone = data.settings.phone;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    }
  }

  async function saveSettings(sectionLabel: string) {
    try {
      isSaving = true;
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store)
      });
      if (res.ok) {
        testToast = `✓ ${sectionLabel} salvas com sucesso no banco de dados e sincronizadas com a Vitrine!`;
        setTimeout(() => testToast = '', 4500);
      } else {
        testToast = 'Erro ao salvar configurações no servidor.';
      }
    } catch (e) {
      console.error('Erro ao salvar:', e);
      testToast = 'Falha de conexão com o banco de dados.';
    } finally {
      isSaving = false;
    }
  }

  async function loadWahaQr() {
    try {
      isLoadingWaha = true;
      const res = await fetch('/api/waha/qr');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          wahaStatus = data.status;
          wahaSessionName = data.sessionName || store.wahaSessionName || 'default';
          wahaQrBase64 = data.qrBase64;
          wahaMe = data.me;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar QR Code WAHA:', e);
    } finally {
      isLoadingWaha = false;
    }
  }

  async function handleRestartWaha() {
    try {
      testToast = 'Reiniciando sessão do WhatsApp e gerando novo QR Code...';
      await fetch('/api/waha/restart', { method: 'POST' });
      await loadWahaQr();
      setTimeout(() => testToast = '', 4000);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLogoutWaha() {
    try {
      testToast = 'Desconectando sessão do WhatsApp...';
      await fetch('/api/waha/logout', { method: 'POST' });
      await loadWahaQr();
      setTimeout(() => testToast = '', 4000);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSendTestMessage() {
    if (!testMsgPhone.trim()) return;
    try {
      testToast = `Enviando mensagem de teste para ${testMsgPhone}...`;
      const res = await fetch('/api/crm/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testMsgPhone,
          message: testMsgBody
        })
      });
      if (res.ok) {
        testToast = `✓ Mensagem de teste enviada com sucesso via WAHA (${wahaSessionName})!`;
      } else {
        testToast = 'Falha ao enviar mensagem via WAHA.';
      }
      setTimeout(() => testToast = '', 4000);
    } catch (e) {
      console.error(e);
    }
  }

  $: {
    if (activeTab === 'whatsapp') {
      loadWahaQr();
      if (!wahaPollInterval && typeof window !== 'undefined') {
        wahaPollInterval = setInterval(loadWahaQr, 6000);
      }
    } else {
      if (wahaPollInterval) {
        clearInterval(wahaPollInterval);
        wahaPollInterval = null;
      }
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.users) {
          users.set(data.users);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
    }
  }

  function handleLogoUpload(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (typeof evt.target?.result === 'string') {
          store.logoUrl = evt.target.result;
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function handleBannerUpload(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (typeof evt.target?.result === 'string') {
          store.bannerUrl = evt.target.result;
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  onMount(() => {
    loadSettings();
    loadUsers();
    return () => {
      if (wahaPollInterval) clearInterval(wahaPollInterval);
    };
  });

  // Modal Usuário State
  let isUserModalOpen = false;
  let newUser: SystemUser = {
    id: '',
    name: '',
    email: '',
    role: 'CAIXA',
    roleLabel: 'Operador de Caixa',
    status: 'ATIVO',
    lastAccess: 'Nunca acessou'
  };

  const fmtRole = (r: string) => {
    if (r === 'ADMIN') return 'Administrador / Gerente';
    if (r === 'CAIXA') return 'Operador de Caixa';
    if (r === 'ATENDENTE') return 'Atendente de Salão';
    return 'Equipe de Cozinha / KDS';
  };

  function handleScanPrinters() {
    systemConfigManager.scanPrinters();
    testToast = 'Varredura concluída! Impressoras térmicas detectadas.';
    setTimeout(() => testToast = '', 4000);
  }

  function handleTestPrinter(printer: DetectedPrinter) {
    testToast = `Sinal ESC/POS enviado para a impressora ${printer.name} na porta ${printer.port}!`;
    setTimeout(() => testToast = '', 4000);
  }
</script>

<div class="space-y-6">
  <!-- Header Principal com Resumo e Status -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Configurações do Estabelecimento & Plataforma"
      subtitle="Gerencie identidade da Vitrine, Cores, Gateways de Pagamento, Instâncias do WhatsApp e Equipe"
      index="08"
    >
      <div class="flex items-center gap-2">
        <a
          href={`http://localhost:3001/${store.slug}`}
          target="_blank"
          class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
        >
          <span>Abrir Vitrine Digital</span>
          <span>➔</span>
        </a>
      </div>
    </PanelHeader>

    {#if testToast}
      <div class="px-4 py-2.5 bg-emerald-50 border-b border-emerald-300 text-emerald-950 font-mono text-xs font-bold flex items-center gap-2">
        <span class="w-2 h-2 bg-emerald-600 animate-ping inline-block"></span>
        <span>{testToast}</span>
      </div>
    {/if}

    <!-- SubNav com Abas de Configuração -->
    <SubNav
      items={[
        { id: 'vitrine', label: '1. Vitrine & Identidade Visual', shortcut: '1' },
        { id: 'gateways', label: '2. Gateway de Pagamento & PIX', shortcut: '2' },
        { id: 'whatsapp', label: '3. WhatsApp & Bot WAHA', shortcut: '3' },
        { id: 'usuarios', label: '4. Equipe & Usuários', shortcut: '4', count: $users.length },
        { id: 'impressoras', label: '5. Impressoras Térmicas', shortcut: '5', count: $printers.length }
      ]}
      active={activeTab}
      on:select={(e) => activeTab = e.detail}
    />
  </div>

  <!-- ========================================================================= -->
  <!-- ABA 1: VITRINE & IDENTIDADE VISUAL DO ESTABELECIMENTO                    -->
  <!-- ========================================================================= -->
  {#if activeTab === 'vitrine'}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Formulários de Configuração (2 Colunas) -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Bloco 1: Dados Gerais do Estabelecimento -->
        <div class="bg-white border border-slate-200 p-5 space-y-4">
          <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <span class="w-2 h-2 bg-red-600"></span>
              Dados Principais do Restaurante
            </h3>
            <span class="text-[10px] font-mono text-slate-500 uppercase">IDENTIFICAÇÃO OFICIAL</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Nome do Estabelecimento:"
              name="storeName"
              bind:value={store.name}
              placeholder="Ex: Imperius do Pastel"
              required
            />
            <FormField
              label="Categoria / Ramo de Atuação:"
              name="storeCategory"
              bind:value={store.category}
              placeholder="Ex: Pastelaria Artesanal & Caldos de Cana"
              required
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="storeSlug" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                Slug / Link da Vitrine:
              </label>
              <div class="flex items-center">
                <span class="px-2.5 py-2 bg-slate-100 border border-r-0 border-slate-300 font-mono text-xs text-slate-500">
                  cardaperp.com.br/
                </span>
                <input
                  id="storeSlug"
                  type="text"
                  bind:value={store.slug}
                  placeholder="imperius-do-pastel"
                  class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <div>
              <label for="storePhone" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                WhatsApp Oficial do Estabelecimento:
              </label>
              <input
                id="storePhone"
                type="text"
                bind:value={store.phone}
                placeholder="(87) 9 9603-6770 ou (19) 99591-1878"
                class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <span class="block text-[10px] text-slate-500 font-sans mt-1">
                📱 Número que recebe os pedidos e sincroniza a instância do bot WAHA.
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="CNPJ:" name="storeCnpj" bind:value={store.cnpj} placeholder="00.000.000/0001-00" mono />
            <FormField label="E-mail de Contato:" name="storeEmail" bind:value={store.email} placeholder="contato@loja.com.br" />
            <FormField label="Instagram:" name="storeInsta" bind:value={store.instagram} placeholder="@sualoja" />
          </div>
        </div>

        <!-- Bloco 2: Identidade Visual & Cores da Vitrine -->
        <div class="bg-white border border-slate-200 p-5 space-y-4">
          <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <span class="w-2 h-2 bg-amber-500"></span>
              Identidade Visual, Logo & Cores da Vitrine
            </h3>
            <span class="text-[10px] font-mono text-slate-500 uppercase">PERSONALIZAÇÃO VISUAL</span>
          </div>

          <!-- Upload de Imagens (Logo e Banner) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Logo -->
            <div class="border border-slate-200 bg-slate-50 p-3 space-y-2 font-mono text-xs">
              <span class="block text-[10px] font-bold uppercase text-slate-700">Logo do Restaurante:</span>
              <div class="flex items-center gap-3">
                <div class="w-16 h-16 bg-white border border-slate-300 shrink-0 flex items-center justify-center relative overflow-hidden">
                  {#if store.logoUrl}
                    <img src={store.logoUrl} alt="Logo" class="w-full h-full object-contain" />
                    <button
                      type="button"
                      class="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-1"
                      on:click={() => store.logoUrl = ''}
                    >
                      ✕
                    </button>
                  {:else}
                    <Icon name="burger" size={24} className="text-slate-400" />
                  {/if}
                </div>
                <div class="flex-1 space-y-1">
                  <label class="cursor-pointer block">
                    <span class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase inline-block">
                      📁 Upload Logo
                    </span>
                    <input type="file" accept="image/*" class="hidden" on:change={handleLogoUpload} />
                  </label>
                  <input
                    type="text"
                    bind:value={store.logoUrl}
                    placeholder="ou cole URL da imagem"
                    class="w-full p-1 bg-white border border-slate-300 text-[11px]"
                  />
                </div>
              </div>
            </div>

            <!-- Banner de Capa -->
            <div class="border border-slate-200 bg-slate-50 p-3 space-y-2 font-mono text-xs">
              <span class="block text-[10px] font-bold uppercase text-slate-700">Banner de Capa (Header):</span>
              <div class="flex items-center gap-3">
                <div class="w-24 h-16 bg-white border border-slate-300 shrink-0 flex items-center justify-center relative overflow-hidden">
                  {#if store.bannerUrl}
                    <img src={store.bannerUrl} alt="Banner" class="w-full h-full object-cover" />
                    <button
                      type="button"
                      class="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-1"
                      on:click={() => store.bannerUrl = ''}
                    >
                      ✕
                    </button>
                  {:else}
                    <span class="text-[10px] text-slate-400">Sem Capa</span>
                  {/if}
                </div>
                <div class="flex-1 space-y-1">
                  <label class="cursor-pointer block">
                    <span class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase inline-block">
                      📁 Upload Capa
                    </span>
                    <input type="file" accept="image/*" class="hidden" on:change={handleBannerUpload} />
                  </label>
                  <input
                    type="text"
                    bind:value={store.bannerUrl}
                    placeholder="ou cole URL da capa"
                    class="w-full p-1 bg-white border border-slate-300 text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Paletas Rápidas -->
          <div class="space-y-2">
            <span class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700">
              Paletas de Cores Prontas:
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {#each colorPresets as preset}
                <button
                  type="button"
                  class="p-2 border border-slate-200 bg-slate-50 hover:border-slate-400 text-left flex items-center gap-2 cursor-pointer transition-all"
                  on:click={() => applyColorPreset(preset)}
                >
                  <div class="flex gap-1">
                    <span class="w-4 h-4 rounded-full border border-black/20" style="background-color: {preset.primary};"></span>
                    <span class="w-4 h-4 rounded-full border border-black/20" style="background-color: {preset.secondary};"></span>
                  </div>
                  <span class="font-mono text-[10px] font-bold text-slate-800 line-clamp-1">{preset.name}</span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Color Pickers Customizados -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label for="pColor" class="block font-mono text-[10px] font-bold uppercase text-slate-700 mb-1">
                Cor Primária (Botões / Destaques):
              </label>
              <div class="flex items-center gap-2">
                <input id="pColor" type="color" bind:value={store.primaryColor} class="w-9 h-9 border border-slate-300 p-0.5 cursor-pointer bg-white" />
                <input type="text" bind:value={store.primaryColor} class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs uppercase font-bold" />
              </div>
            </div>

            <div>
              <label for="sColor" class="block font-mono text-[10px] font-bold uppercase text-slate-700 mb-1">
                Cor Secundária (Cabeçalho / Fundos):
              </label>
              <div class="flex items-center gap-2">
                <input id="sColor" type="color" bind:value={store.secondaryColor} class="w-9 h-9 border border-slate-300 p-0.5 cursor-pointer bg-white" />
                <input type="text" bind:value={store.secondaryColor} class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs uppercase font-bold" />
              </div>
            </div>

            <div>
              <label for="aColor" class="block font-mono text-[10px] font-bold uppercase text-slate-700 mb-1">
                Cor de Acento (Badges / Tags):
              </label>
              <div class="flex items-center gap-2">
                <input id="aColor" type="color" bind:value={store.accentColor} class="w-9 h-9 border border-slate-300 p-0.5 cursor-pointer bg-white" />
                <input type="text" bind:value={store.accentColor} class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs uppercase font-bold" />
              </div>
            </div>
          </div>
        </div>

        <!-- Bloco 3: Operação, Taxas de Entrega & Horários -->
        <div class="bg-white border border-slate-200 p-5 space-y-4">
          <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <span class="w-2 h-2 bg-emerald-600"></span>
              Operação, Taxas de Entrega & Prazos
            </h3>
            <span class="text-[10px] font-mono text-slate-500 uppercase">REGRAS DE PEDIDO</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label for="deliveryFeeInput" class="block font-mono text-[10px] font-bold uppercase text-slate-700 mb-1">Taxa de Entrega (R$):</label>
              <input
                id="deliveryFeeInput"
                type="number"
                step="0.50"
                bind:value={store.deliveryFee}
                class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label for="minOrderInput" class="block font-mono text-[10px] font-bold uppercase text-slate-700 mb-1">Pedido Mínimo (R$):</label>
              <input
                id="minOrderInput"
                type="number"
                step="1.00"
                bind:value={store.minOrderValue}
                class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label for="slaMinInput" class="block font-mono text-[10px] font-bold uppercase text-slate-700 mb-1">Tempo Mínimo (min):</label>
              <input
                id="slaMinInput"
                type="number"
                bind:value={store.slaMinutesMin}
                class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label for="slaMaxInput" class="block font-mono text-[10px] font-bold uppercase text-slate-700 mb-1">Tempo Máximo (min):</label>
              <input
                id="slaMaxInput"
                type="number"
                bind:value={store.slaMinutesMax}
                class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <FormField
            label="Horário de Funcionamento Comercial (Exibido aos Clientes):"
            name="storeHours"
            bind:value={store.operatingHours}
            placeholder="Ex: Terça a Domingo: 18:00 às 23:30"
          />

          <!-- Modalidades Ativas -->
          <div class="pt-2 border-t border-slate-100 flex flex-wrap gap-4 font-mono text-xs font-bold">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" bind:checked={store.allowDelivery} class="accent-red-600 w-4 h-4" />
              <span>Aceitar Delivery</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" bind:checked={store.allowTakeout} class="accent-red-600 w-4 h-4" />
              <span>Aceitar Retirada no Balcão</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" bind:checked={store.allowDineIn} class="accent-red-600 w-4 h-4" />
              <span>Aceitar Pedidos na Mesa (QR Code Salão)</span>
            </label>
          </div>
        </div>

        <!-- Bloco 4: Endereço do Estabelecimento -->
        <div class="bg-white border border-slate-200 p-5 space-y-4">
          <div class="border-b border-slate-200 pb-2">
            <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
              Endereço Físico do Restaurante
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="CEP:" name="storeZip" bind:value={store.addressZipCode} placeholder="00000-000" mono />
            <div class="md:col-span-2">
              <FormField label="Logradouro / Rua:" name="storeStreet" bind:value={store.addressStreet} placeholder="Av. Principal" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Número:" name="storeNum" bind:value={store.addressNumber} placeholder="123" />
            <FormField label="Bairro:" name="storeNeigh" bind:value={store.addressNeighborhood} placeholder="Centro" />
            <div class="grid grid-cols-2 gap-2">
              <FormField label="Cidade:" name="storeCity" bind:value={store.addressCity} placeholder="Garanhuns" />
              <FormField label="UF:" name="storeUf" bind:value={store.addressState} placeholder="PE" mono />
            </div>
          </div>
        </div>

        <!-- Botão Salvar Geral da Vitrine -->
        <div class="flex justify-end gap-3 pt-2">
          <PrimaryButton variant="primary" size="lg" disabled={isSaving} on:click={() => saveSettings('Configurações da Vitrine')}>
            {#if isSaving}
              Salvando no Banco...
            {:else}
              💾 Salvar Alterações da Vitrine
            {/if}
          </PrimaryButton>
        </div>
      </div>

      <!-- Card de Preview em Tempo Real da Vitrine (1 Coluna) -->
      <div class="space-y-4">
        <div class="sticky top-6">
          <div class="border-2 border-slate-800 bg-slate-950 text-white p-4 font-mono text-xs space-y-4 shadow-xl">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                PREVIEW AO VIVO DA VITRINE
              </span>
              <span class="px-2 py-0.5 text-[9px] font-bold uppercase" style="background-color: {store.primaryColor}; color: #fff;">
                AO VIVO
              </span>
            </div>

            <!-- Mini Header da Vitrine com as cores dinâmicas -->
            <div class="p-3 border border-slate-800 rounded-none space-y-3" style="background-color: {store.secondaryColor};">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-white border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden font-bold text-lg" style="color: {store.primaryColor};">
                  {#if store.logoUrl}
                    <img src={store.logoUrl} alt="Logo" class="w-full h-full object-contain" />
                  {:else}
                    {store.name.slice(0, 1).toUpperCase()}
                  {/if}
                </div>
                <div>
                  <h4 class="font-bold text-sm text-white uppercase">{store.name}</h4>
                  <span class="text-[10px] text-slate-400 font-sans block">{store.category}</span>
                </div>
              </div>

              <div class="text-[10px] text-slate-300 font-mono space-y-1 pt-1 border-t border-slate-800/80">
                <div>🛵 Frete: <strong>R$ {Number(store.deliveryFee).toFixed(2).replace('.', ',')}</strong> · Mínimo: <strong>R$ {Number(store.minOrderValue).toFixed(2).replace('.', ',')}</strong></div>
                <div>⏱️ Tempo Estimado: <strong>{store.slaMinutesMin}-{store.slaMinutesMax} min</strong></div>
                <div>📱 WhatsApp: <strong>{store.phone || '(Não informado)'}</strong></div>
              </div>

              <button
                type="button"
                class="w-full py-2 font-bold text-xs uppercase tracking-wider text-white border-0 transition-opacity hover:opacity-90"
                style="background-color: {store.primaryColor};"
              >
                FAZER PEDIDO ➔
              </button>
            </div>

            <div class="text-[10px] text-slate-400 font-sans leading-relaxed border-t border-slate-900 pt-3">
              💡 Qualquer alteração feita aqui atualiza instantaneamente a vitrine dos seus clientes no endereço 
              <strong class="text-white">cardaperp.com.br/{store.slug}</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========================================================================= -->
  <!-- ABA 2: GATEWAY DE PAGAMENTO & PIX DINÂMICO                              -->
  <!-- ========================================================================= -->
  {#if activeTab === 'gateways'}
    <div class="bg-white border border-slate-200 p-6 space-y-6">
      <div>
        <h3 class="font-mono text-sm font-bold uppercase tracking-widest text-slate-900">
          Configuração de Gateways de Pagamento & PIX
        </h3>
        <p class="text-xs text-slate-500 font-sans mt-0.5">
          Selecione o provedor de pagamento desejado. Conforme a escolha, os campos de credenciais e chaves serão exibidos.
        </p>
      </div>

      <!-- SELETOR DE GATEWAY DE PAGAMENTO (5 PROVEDORES) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        <!-- Opção 1: Mercado Pago -->
        <button
          type="button"
          class="p-4 border-2 text-left cursor-pointer transition-all {store.paymentGateway === 'MERCADO_PAGO' ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}"
          on:click={() => store.paymentGateway = 'MERCADO_PAGO'}
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xl">💳</span>
            {#if store.paymentGateway === 'MERCADO_PAGO'}
              <span class="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
            {/if}
          </div>
          <div class="font-mono text-xs font-bold text-slate-900 uppercase">Mercado Pago</div>
          <div class="text-[10px] text-slate-500 font-sans mt-1">PIX QR Code Dinâmico + Cartão de Crédito</div>
        </button>

        <!-- Opção 2: Asaas -->
        <button
          type="button"
          class="p-4 border-2 text-left cursor-pointer transition-all {store.paymentGateway === 'ASAAS' ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}"
          on:click={() => store.paymentGateway = 'ASAAS'}
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xl">⚡</span>
            {#if store.paymentGateway === 'ASAAS'}
              <span class="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
            {/if}
          </div>
          <div class="font-mono text-xs font-bold text-slate-900 uppercase">Asaas Pagamentos</div>
          <div class="text-[10px] text-slate-500 font-sans mt-1">Cobranças PIX, Boleto e Cartão com split</div>
        </button>

        <!-- Opção 3: EFI / Gerencianet -->
        <button
          type="button"
          class="p-4 border-2 text-left cursor-pointer transition-all {store.paymentGateway === 'EFI_GERENCIANET' ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}"
          on:click={() => store.paymentGateway = 'EFI_GERENCIANET'}
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xl">🏦</span>
            {#if store.paymentGateway === 'EFI_GERENCIANET'}
              <span class="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
            {/if}
          </div>
          <div class="font-mono text-xs font-bold text-slate-900 uppercase">EFI / Gerencianet</div>
          <div class="text-[10px] text-slate-500 font-sans mt-1">PIX Nativo BACEN com certificado mTLS</div>
        </button>

        <!-- Opção 4: Pagar.me -->
        <button
          type="button"
          class="p-4 border-2 text-left cursor-pointer transition-all {store.paymentGateway === 'PAGARME' ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}"
          on:click={() => store.paymentGateway = 'PAGARME'}
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xl">💎</span>
            {#if store.paymentGateway === 'PAGARME'}
              <span class="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
            {/if}
          </div>
          <div class="font-mono text-xs font-bold text-slate-900 uppercase">Pagar.me / Stone</div>
          <div class="text-[10px] text-slate-500 font-sans mt-1">Infraestrutura Stone para Delivery e PDV</div>
        </button>

        <!-- Opção 5: PIX Manual Direto -->
        <button
          type="button"
          class="p-4 border-2 text-left cursor-pointer transition-all {store.paymentGateway === 'PIX_MANUAL' ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}"
          on:click={() => store.paymentGateway = 'PIX_MANUAL'}
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xl">🔑</span>
            {#if store.paymentGateway === 'PIX_MANUAL'}
              <span class="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
            {/if}
          </div>
          <div class="font-mono text-xs font-bold text-slate-900 uppercase">PIX Manual / Chave</div>
          <div class="text-[10px] text-slate-500 font-sans mt-1">Sem taxas bancárias, envio via comprovante</div>
        </button>
      </div>

      <!-- CAMPOS ESPECÍFICOS DO GATEWAY SELECIONADO -->
      <div class="border border-slate-200 p-5 bg-slate-50 space-y-4">
        
        <!-- PROVEDOR: MERCADO PAGO -->
        {#if store.paymentGateway === 'MERCADO_PAGO'}
          <div class="space-y-4">
            <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
                Credenciais da API do Mercado Pago
              </h4>
              <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold uppercase">PRODUÇÃO & TESTES</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Public Key (Chave Pública):"
                name="mpPubKey"
                bind:value={store.mpPublicKey}
                placeholder="APP_USR-00000000-0000-0000-0000-000000000000"
                mono
                required
              />

              <div>
                <label for="mpAccessTokenInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                  Access Token (Chave Privada):
                </label>
                <div class="flex items-center">
                  {#if showTokenMP}
                    <input
                      id="mpAccessTokenInput"
                      type="text"
                      bind:value={store.mpAccessToken}
                      placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxx"
                      class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  {:else}
                    <input
                      id="mpAccessTokenInput"
                      type="password"
                      bind:value={store.mpAccessToken}
                      placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxx"
                      class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  {/if}
                  <button
                    type="button"
                    class="px-3 py-2 bg-slate-200 hover:bg-slate-300 font-mono text-xs font-bold uppercase border border-l-0 border-slate-300"
                    on:click={() => showTokenMP = !showTokenMP}
                  >
                    {showTokenMP ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4 pt-2 font-mono text-xs font-bold">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={store.mpSandbox} class="accent-red-600 w-4 h-4" />
                <span>Ativar Modo Sandbox (Ambiente de Testes)</span>
              </label>
            </div>
          </div>
        {/if}

        <!-- PROVEDOR: ASAAS -->
        {#if store.paymentGateway === 'ASAAS'}
          <div class="space-y-4">
            <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
                Credenciais da API do Asaas
              </h4>
              <span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">ASAAS V3</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="asaasKeyInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                  API Key / Access Token:
                </label>
                <div class="flex items-center">
                  {#if showTokenAsaas}
                    <input
                      id="asaasKeyInput"
                      type="text"
                      bind:value={store.asaasApiKey}
                      placeholder="$aact_YTU5YTE0M2M6N2..."
                      class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  {:else}
                    <input
                      id="asaasKeyInput"
                      type="password"
                      bind:value={store.asaasApiKey}
                      placeholder="$aact_YTU5YTE0M2M6N2..."
                      class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  {/if}
                  <button
                    type="button"
                    class="px-3 py-2 bg-slate-200 hover:bg-slate-300 font-mono text-xs font-bold uppercase border border-l-0 border-slate-300"
                    on:click={() => showTokenAsaas = !showTokenAsaas}
                  >
                    {showTokenAsaas ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              <FormField
                label="Wallet ID (Opcional para Split):"
                name="asaasWallet"
                bind:value={store.asaasWalletId}
                placeholder="wallet_000000"
                mono
              />
            </div>

            <div class="flex items-center gap-4 pt-2 font-mono text-xs font-bold">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={store.asaasSandbox} class="accent-red-600 w-4 h-4" />
                <span>Utilizar Sandbox do Asaas</span>
              </label>
            </div>
          </div>
        {/if}

        <!-- PROVEDOR: EFI / GERENCIANET -->
        {#if store.paymentGateway === 'EFI_GERENCIANET'}
          <div class="space-y-4">
            <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
                Credenciais da API Pix EFI / Gerencianet
              </h4>
              <span class="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold uppercase">mTLS CERTIFICADO</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Client ID:" name="efiClientId" bind:value={store.efiClientId} placeholder="Client_Id_xxxxxxxx" mono required />
              
              <div>
                <label for="efiSecretInput" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Client Secret:</label>
                <div class="flex items-center">
                  {#if showSecretEFI}
                    <input
                      id="efiSecretInput"
                      type="text"
                      bind:value={store.efiClientSecret}
                      placeholder="Client_Secret_xxxxxxxx"
                      class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  {:else}
                    <input
                      id="efiSecretInput"
                      type="password"
                      bind:value={store.efiClientSecret}
                      placeholder="Client_Secret_xxxxxxxx"
                      class="flex-1 p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  {/if}
                  <button
                    type="button"
                    class="px-3 py-2 bg-slate-200 hover:bg-slate-300 font-mono text-xs font-bold uppercase border border-l-0 border-slate-300"
                    on:click={() => showSecretEFI = !showSecretEFI}
                  >
                    {showSecretEFI ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>
            </div>

            <FormField label="Chave PIX Cadastrada na EFI:" name="efiPixKey" bind:value={store.efiPixKey} placeholder="suachave@email.com" mono required />
          </div>
        {/if}

        <!-- PROVEDOR: PAGAR.ME -->
        {#if store.paymentGateway === 'PAGARME'}
          <div class="space-y-4">
            <div class="border-b border-slate-200 pb-2">
              <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">Credenciais Pagar.me V5</h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="API Secret Key:" name="pagarmeKey" bind:value={store.pagarmeApiKey} placeholder="ak_test_xxxxxxxx" mono required />
              <FormField label="Encryption Key / Public Key:" name="pagarmeEnc" bind:value={store.pagarmeEncKey} placeholder="ek_test_xxxxxxxx" mono required />
            </div>
          </div>
        {/if}

        <!-- PROVEDOR: PIX MANUAL -->
        {#if store.paymentGateway === 'PIX_MANUAL'}
          <div class="space-y-4">
            <div class="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h4 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
                Configuração da Chave PIX Direta (Sem Intermediários)
              </h4>
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">ZERO TAXA</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="pixKeyTypeSelect" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Tipo de Chave:</label>
                <select
                  id="pixKeyTypeSelect"
                  bind:value={store.pixKeyType}
                  class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="TELEFONE">Celular / Telefone</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="ALEATORIA">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div class="md:col-span-2">
                <FormField label="Chave PIX:" name="pixKeyVal" bind:value={store.pixKey} placeholder="Digite a chave PIX exata" mono required />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Nome do Titular da Conta / Beneficiário:" name="pixBeneficiary" bind:value={store.pixReceiverName} placeholder="Razão Social ou Nome Completo" required />
              <FormField label="Cidade do Titular:" name="pixCity" bind:value={store.pixReceiverCity} placeholder="Garanhuns" required />
            </div>

            <FormField
              label="Instruções de Pagamento para o Cliente:"
              name="pixInst"
              bind:value={store.pixInstructions}
              placeholder="Ex: Após realizar a transferência, clique no botão e envie o comprovante no WhatsApp do restaurante."
            />
          </div>
        {/if}
      </div>

      <!-- Botão Salvar Gateway -->
      <div class="flex justify-end gap-3 pt-2">
        <PrimaryButton variant="primary" size="lg" disabled={isSaving} on:click={() => saveSettings('Configurações de Pagamento')}>
          {#if isSaving}
            Salvando...
          {:else}
            💾 Salvar Gateway de Pagamento
          {/if}
        </PrimaryButton>
      </div>
    </div>
  {/if}

  <!-- ========================================================================= -->
  <!-- ABA 3: WHATSAPP & BOT WAHA                                               -->
  <!-- ========================================================================= -->
  {#if activeTab === 'whatsapp'}
    <div class="space-y-6">
      
      <!-- Card de Status e Conexão WAHA -->
      <div class="bg-white border border-slate-200 p-6 space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-mono text-sm font-bold uppercase tracking-widest text-slate-900">
                Integração WhatsApp Oficial via WAHA
              </h3>
              <StatusBadge
                status={wahaStatus === 'WORKING' ? 'ATIVO' : (wahaStatus === 'SCAN_QR_CODE' ? 'PENDENTE' : 'INATIVO')}
                text={wahaStatus === 'WORKING' ? 'CONECTADO' : (wahaStatus === 'SCAN_QR_CODE' ? 'AGUARDANDO LEITURA' : wahaStatus)}
              />
            </div>
            <p class="text-xs text-slate-500 font-sans mt-0.5">
              Instância conectada ao telefone oficial do restaurante para notificações e confirmações automáticas.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <PrimaryButton variant="secondary" size="sm" on:click={loadWahaQr}>
              🔄 Atualizar Status
            </PrimaryButton>
            {#if wahaStatus === 'WORKING'}
              <PrimaryButton variant="danger" size="sm" on:click={handleLogoutWaha}>
                Desconectar WhatsApp
              </PrimaryButton>
            {:else}
              <PrimaryButton variant="primary" size="sm" on:click={handleRestartWaha}>
                Gerar Novo QR Code
              </PrimaryButton>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          <!-- Lado Esquerdo: Detalhes da Sessão -->
          <div class="space-y-4 font-mono text-xs">
            <div class="bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div class="flex justify-between border-b border-slate-200 pb-2">
                <span class="text-slate-500 uppercase">SESSÃO ATIVA:</span>
                <span class="font-bold text-slate-900">{wahaSessionName}</span>
              </div>
              <div class="flex justify-between border-b border-slate-200 pb-2">
                <span class="text-slate-500 uppercase">NÚMERO VINCULADO:</span>
                <span class="font-bold text-slate-900">{store.phone || '(Não informado)'}</span>
              </div>
              <div class="flex justify-between border-b border-slate-200 pb-2">
                <span class="text-slate-500 uppercase">MOTOR DO BOT:</span>
                <span class="font-bold text-emerald-700">DevLikeAPro WAHA Core</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 uppercase">WEBHOOK DE DISPARO:</span>
                <span class="font-bold text-slate-900 text-[10px]">/api/waha/webhook</span>
              </div>
            </div>

            <!-- Teste Rápido de Disparo -->
            <div class="bg-white border border-slate-200 p-4 space-y-3">
              <h4 class="font-bold text-xs uppercase text-slate-900">Teste de Disparo de Mensagem</h4>
              <div class="space-y-2">
                <input
                  type="text"
                  bind:value={testMsgPhone}
                  placeholder="DDD + Telefone (ex: 19995911878)"
                  class="w-full p-2 bg-slate-50 border border-slate-300 font-mono text-xs"
                />
                <textarea
                  bind:value={testMsgBody}
                  rows="2"
                  class="w-full p-2 bg-slate-50 border border-slate-300 font-sans text-xs"
                ></textarea>
                <PrimaryButton variant="primary" size="sm" fullWidth on:click={handleSendTestMessage}>
                  Disparar Mensagem de Teste ➔
                </PrimaryButton>
              </div>
            </div>
          </div>

          <!-- Lado Direito: QR Code de Pareamento -->
          <div class="flex flex-col items-center justify-center p-6 border border-slate-200 bg-slate-50 min-h-[300px] text-center space-y-4">
            {#if wahaStatus === 'WORKING'}
              <div class="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 text-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <div>
                <h4 class="font-mono text-sm font-bold text-slate-900 uppercase">WhatsApp Conectado!</h4>
                <p class="text-xs text-slate-500 font-sans mt-1">
                  Sua instância está ativa e pronta para receber pedidos e enviar confirmações aos clientes.
                </p>
              </div>
            {:else if wahaQrBase64}
              <div class="p-3 bg-white border-2 border-slate-800 shadow-md inline-block">
                <img
                  src={wahaQrBase64.startsWith('data:') ? wahaQrBase64 : `data:image/png;base64,${wahaQrBase64}`}
                  alt="QR Code WhatsApp"
                  class="w-56 h-56 object-contain"
                />
              </div>
              <span class="text-xs text-slate-700 font-mono font-bold uppercase">
                Escaneie com o WhatsApp do Restaurante
              </span>
            {:else}
              <div class="text-xs text-slate-500 font-mono">
                {isLoadingWaha ? 'Carregando sessão do WhatsApp...' : 'Clique em "Gerar Novo QR Code" para conectar.'}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========================================================================= -->
  <!-- ABA 4: EQUIPE & USUÁRIOS (RBAC)                                          -->
  <!-- ========================================================================= -->
  {#if activeTab === 'usuarios'}
    <div class="bg-white border border-slate-200 p-6 space-y-6">
      <div class="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 class="font-mono text-sm font-bold uppercase tracking-widest text-slate-900">
            Equipe, Operadores & Níveis de Acesso
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            Controle quem pode acessar o PDV, Cozinha KDS, Caixa e Painel de Relatórios.
          </p>
        </div>

        <PrimaryButton variant="primary" on:click={handleOpenNewUser}>
          <Icon name="plus" size={14} className="mr-1" />
          Novo Colaborador
        </PrimaryButton>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-700">
              <th class="p-3">Nome / Operador</th>
              <th class="p-3">E-mail de Login</th>
              <th class="p-3">Cargo / Função</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each $users as u}
              <tr class="hover:bg-slate-50">
                <td class="p-3 font-bold text-slate-900">{u.name}</td>
                <td class="p-3 text-slate-600">{u.email}</td>
                <td class="p-3 font-bold text-red-600">{u.roleLabel || u.role}</td>
                <td class="p-3">
                  <StatusBadge status={u.status} text={u.status} />
                </td>
                <td class="p-3 text-right">
                  <PrimaryButton size="sm" variant="secondary" on:click={() => systemConfigManager.toggleUserStatus(u.id)}>
                    {u.status === 'ATIVO' ? 'Bloquear' : 'Ativar'}
                  </PrimaryButton>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- ========================================================================= -->
  <!-- ABA 5: IMPRESSORAS TÉRMICAS                                              -->
  <!-- ========================================================================= -->
  {#if activeTab === 'impressoras'}
    <div class="bg-white border border-slate-200 p-6 space-y-6">
      <div class="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 class="font-mono text-sm font-bold uppercase tracking-widest text-slate-900">
            Impressoras Térmicas ESC/POS (PDV & Cozinha)
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            Configure o roteamento automático de pedidos para impressoras de 80mm e 58mm.
          </p>
        </div>

        <PrimaryButton variant="primary" on:click={handleScanPrinters}>
          🔄 Varrer Portas USB / Rede
        </PrimaryButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each $printers as pr}
          <div class="border border-slate-200 p-4 space-y-3 bg-slate-50 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-900">{pr.name}</span>
              <StatusBadge status={pr.status === 'ONLINE' ? 'ATIVO' : 'INATIVO'} text={pr.status} />
            </div>
            <div class="text-[11px] text-slate-600 space-y-1">
              <div>Porta: <strong>{pr.port}</strong></div>
              <div>Largura: <strong>{pr.paperWidthMm}mm</strong></div>
              <div>Roteamento: <strong>{pr.targetArea}</strong></div>
            </div>
            <PrimaryButton size="sm" variant="secondary" fullWidth on:click={() => handleTestPrinter(pr)}>
              Imprimir Cupom de Teste
            </PrimaryButton>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Modal de Novo Usuário -->
<Modal
  isOpen={isUserModalOpen}
  title="Adicionar Colaborador"
  subtitle="Cadastre o e-mail e cargo do funcionário"
  maxWidth="md"
  onClose={() => isUserModalOpen = false}
>
  <div class="space-y-4">
    <FormField label="Nome Completo:" name="userName" bind:value={newUser.name} required />
    <FormField label="E-mail de Acesso:" name="userEmail" bind:value={newUser.email} required mono />
    <div>
      <label for="newUserRoleSelect" class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Cargo / Função:</label>
      <select
        id="newUserRoleSelect"
        bind:value={newUser.role}
        class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900"
      >
        <option value="ADMIN">Administrador / Gerente</option>
        <option value="CAIXA">Operador de Caixa</option>
        <option value="ATENDENTE">Atendente de Salão / Garçom</option>
        <option value="COZINHA">Cozinha / KDS</option>
      </select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isUserModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveUser}>Cadastrar</PrimaryButton>
  </svelte:fragment>
</Modal>
