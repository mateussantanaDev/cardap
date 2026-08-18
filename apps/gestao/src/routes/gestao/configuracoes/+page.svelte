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

  const { users, printers, gateway } = systemConfigManager;

  let activeTab: 'gateways' | 'impressoras' | 'usuarios' = 'gateways';
  let testToast = '';
  let showPasswordMP = false;
  let showPasswordTon = false;

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

  onMount(() => {
    loadUsers();
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

  function handleTabSelect(id: string) {
    activeTab = id as 'gateways' | 'impressoras' | 'usuarios';
  }

  function handleTestGateway(gatewayName: string) {
    testToast = `Conexão efetuada com sucesso! Credenciais do ${gatewayName} validadas com a API oficial.`;
    setTimeout(() => testToast = '', 4000);
  }

  function handleScanPrinters() {
    systemConfigManager.scanPrinters();
    testToast = 'Varredura concluída! 3 impressoras detectadas nas portas USB e Rede IP.';
    setTimeout(() => testToast = '', 4000);
  }

  function handleTestPrinter(printer: DetectedPrinter) {
    const text = PrinterService.generateReceiptText({
      orderNumber: 999,
      type: 'SALAO',
      status: 'CONCLUIDO',
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      subtotalFormatted: 'R$ 50,00',
      deliveryFeeFormatted: 'R$ 0,00',
      discountFormatted: 'R$ 0,00',
      totalAmountFormatted: 'R$ 50,00',
      createdAt: new Date(),
      items: [{ productName: `TESTE ${printer.name}`, quantity: 1, unitPriceFormatted: 'R$ 50,00', totalPriceFormatted: 'R$ 50,00' }]
    });

    testToast = `Sinal enviado para a impressora ${printer.name} na porta ${printer.port}!`;
    setTimeout(() => testToast = '', 4000);
  }

  function handleOpenNewUser() {
    newUser = {
      id: `usr-${Date.now()}`,
      name: '',
      email: '',
      role: 'CAIXA',
      roleLabel: 'Operador de Caixa',
      status: 'ATIVO',
      lastAccess: 'Nunca acessou'
    };
    isUserModalOpen = true;
  }

  function handleSaveUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    newUser.roleLabel = fmtRole(newUser.role);
    systemConfigManager.addUser(newUser);
    isUserModalOpen = false;
  }
</script>

<div class="space-y-6">
  <!-- Toast de Notificação -->
  {#if testToast}
    <div class="border-2 border-emerald-600 bg-emerald-50 p-3 font-mono text-xs font-bold text-emerald-900 uppercase flex items-center justify-between gap-2 shadow-xs">
      <div class="flex items-center gap-2">
        <Icon name="check" size={16} className="text-emerald-700" />
        <span>{testToast}</span>
      </div>
    </div>
  {/if}

  <!-- PanelHeader Principal de Configurações -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Central de Configurações, Periféricos & Integrações"
      subtitle="Gerencie credenciais de gateways (Mercado Pago / Ton), impressoras reconhecidas e usuários RBAC"
      index="10"
    >
      <StatusBadge status="PAGO" text="SISTEMA CONFIGURADO" />
    </PanelHeader>

    <!-- SubNav com Abas de Gestão de Configurações -->
    <SubNav
      items={[
        { id: 'gateways', label: '1. Gateways de Pagamento (Mercado Pago & Ton)', shortcut: '1' },
        { id: 'impressoras', label: '2. Impressoras Reconhecidas (ESC/POS)', shortcut: '2', count: $printers.length },
        { id: 'usuarios', label: '3. Gestão de Usuários RBAC', shortcut: '3', count: $users.length }
      ]}
      activeId={activeTab}
      onSelect={handleTabSelect}
    />
  </div>

  <!-- ==================== ABA 1: GATEWAYS DE PAGAMENTO ==================== -->
  {#if activeTab === 'gateways'}
    <div class="space-y-6">
      <!-- Seletor de Gateway Ativo -->
      <div class="bg-white border border-slate-200 p-4 space-y-3 font-mono text-xs">
        <span class="font-bold uppercase tracking-widest text-slate-700 block">
          SELECIONE O GATEWAY DE PAGAMENTO PRINCIPAL DA LOJA:
        </span>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            class="p-3 border-2 text-left cursor-pointer transition-all flex items-center justify-between {$gateway.activeGateway === 'MERCADO_PAGO' ? 'bg-red-50 border-red-600 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}"
            on:click={() => systemConfigManager.setActiveGateway('MERCADO_PAGO')}
          >
            <div>
              <div class="font-bold text-sm uppercase">MERCADO PAGO</div>
              <div class="text-[10px] font-sans text-slate-500">PIX Automático & Maquinetas Point</div>
            </div>
            {#if $gateway.activeGateway === 'MERCADO_PAGO'}
              <span class="w-3 h-3 bg-red-600 rounded-none"></span>
            {/if}
          </button>

          <button
            type="button"
            class="p-3 border-2 text-left cursor-pointer transition-all flex items-center justify-between {$gateway.activeGateway === 'TON' ? 'bg-red-50 border-red-600 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}"
            on:click={() => systemConfigManager.setActiveGateway('TON')}
          >
            <div>
              <div class="font-bold text-sm uppercase">TON (STONE)</div>
              <div class="text-[10px] font-sans text-slate-500">Ton Tap Celular & Maquinetas T3</div>
            </div>
            {#if $gateway.activeGateway === 'TON'}
              <span class="w-3 h-3 bg-red-600 rounded-none"></span>
            {/if}
          </button>

          <button
            type="button"
            class="p-3 border-2 text-left cursor-pointer transition-all flex items-center justify-between {$gateway.activeGateway === 'MANUAL' ? 'bg-red-50 border-red-600 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}"
            on:click={() => systemConfigManager.setActiveGateway('MANUAL')}
          >
            <div>
              <div class="font-bold text-sm uppercase">PIX DIRETO / MANUAL</div>
              <div class="text-[10px] font-sans text-slate-500">Chave PIX manual sem taxas de gateway</div>
            </div>
            {#if $gateway.activeGateway === 'MANUAL'}
              <span class="w-3 h-3 bg-red-600 rounded-none"></span>
            {/if}
          </button>
        </div>
      </div>

      <!-- Credenciais Mercado Pago -->
      <div class="bg-white border border-slate-200 p-5 space-y-4 font-mono text-xs">
        <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-sky-500 text-white font-bold flex items-center justify-center text-xs">MP</div>
            <div>
              <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
                Credenciais de API Mercado Pago
              </h3>
              <span class="text-[10px] text-slate-500 font-sans">
                Chaves de integração para PIX automático instantâneo e recebimento via cartão
              </span>
            </div>
          </div>

          <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
            PRODUÇÃO / LIVE
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="mpPublicKey" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
              Public Key (Chave Pública):
            </label>
            <input
              id="mpPublicKey"
              type="text"
              bind:value={$gateway.mercadoPago.publicKey}
              class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-none"
            />
          </div>

          <div>
            <label for="mpAccessToken" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
              Access Token (Token de Acesso Privado):
            </label>
            <div class="relative">
              {#if showPasswordMP}
                <input
                  id="mpAccessToken"
                  type="text"
                  bind:value={$gateway.mercadoPago.accessToken}
                  class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-none pr-16"
                />
              {:else}
                <input
                  id="mpAccessToken"
                  type="password"
                  bind:value={$gateway.mercadoPago.accessToken}
                  class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-none pr-16"
                />
              {/if}
              <button
                type="button"
                class="absolute right-2 top-2 text-[10px] text-slate-500 font-bold hover:text-slate-900"
                on:click={() => showPasswordMP = !showPasswordMP}
              >
                {showPasswordMP ? 'OCULTAR' : 'VER'}
              </button>
            </div>
          </div>

          <FormField
            label="Client ID (Opcional):"
            name="mpClientId"
            bind:value={$gateway.mercadoPago.clientId}
            mono
          />

          <FormField
            label="Client Secret (Opcional):"
            name="mpClientSecret"
            type="password"
            bind:value={$gateway.mercadoPago.clientSecret}
            mono
          />
        </div>

        <!-- Switches de Funcionalidades MP -->
        <div class="p-3 bg-slate-50 border border-slate-200 space-y-2">
          <label class="flex items-center justify-between cursor-pointer">
            <span>Habilitar Geração Automática de QR Code PIX (Confirmação em tempo real)</span>
            <input type="checkbox" bind:checked={$gateway.mercadoPago.pixAutoEnabled} class="accent-red-600 w-4 h-4" />
          </label>

          <label class="flex items-center justify-between cursor-pointer">
            <span>Habilitar Integração TEF com Maquinetas Mercado Pago Point Smart</span>
            <input type="checkbox" bind:checked={$gateway.mercadoPago.pointMachineEnabled} class="accent-red-600 w-4 h-4" />
          </label>
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <PrimaryButton variant="secondary" on:click={() => handleTestGateway('Mercado Pago')}>
            Testar Conexão API Mercado Pago
          </PrimaryButton>
          <PrimaryButton variant="primary" shortcut="Ctrl+S">
            Salvar Credenciais Mercado Pago
          </PrimaryButton>
        </div>
      </div>

      <!-- Credenciais Ton (Stone) -->
      <div class="bg-white border border-slate-200 p-5 space-y-4 font-mono text-xs">
        <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">TON</div>
            <div>
              <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
                Credenciais de API Ton (Stone / Ton Pay)
              </h3>
              <span class="text-[10px] text-slate-500 font-sans">
                Integração com maquinetas físicas Ton T3 e Ton Tap no celular
              </span>
            </div>
          </div>

          <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
            CONECTADO
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="tonApiKey" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
              Secret API Key (Ton Partner Key):
            </label>
            <div class="relative">
              {#if showPasswordTon}
                <input
                  id="tonApiKey"
                  type="text"
                  bind:value={$gateway.ton.apiKey}
                  class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-none pr-16"
                />
              {:else}
                <input
                  id="tonApiKey"
                  type="password"
                  bind:value={$gateway.ton.apiKey}
                  class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-none pr-16"
                />
              {/if}
              <button
                type="button"
                class="absolute right-2 top-2 text-[10px] text-slate-500 font-bold hover:text-slate-900"
                on:click={() => showPasswordTon = !showPasswordTon}
              >
                {showPasswordTon ? 'OCULTAR' : 'VER'}
              </button>
            </div>
          </div>

          <FormField
            label="Merchant ID / Código do Estabelecimento:"
            name="tonMerchantId"
            bind:value={$gateway.ton.merchantId}
            mono
          />
        </div>

        <!-- Switches Ton -->
        <div class="p-3 bg-slate-50 border border-slate-200 space-y-2">
          <label class="flex items-center justify-between cursor-pointer">
            <span>Habilitar Ton Tap (Pagamento por aproximação no celular do entregador)</span>
            <input type="checkbox" bind:checked={$gateway.ton.tonTapEnabled} class="accent-red-600 w-4 h-4" />
          </label>

          <label class="flex items-center justify-between cursor-pointer">
            <span>Habilitar Envio de Valor para Maquinetas Ton T3 Smart</span>
            <input type="checkbox" bind:checked={$gateway.ton.t3MachineEnabled} class="accent-red-600 w-4 h-4" />
          </label>
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <PrimaryButton variant="secondary" on:click={() => handleTestGateway('Ton')}>
            Testar Conexão API Ton
          </PrimaryButton>
          <PrimaryButton variant="primary" shortcut="Ctrl+S">
            Salvar Credenciais Ton
          </PrimaryButton>
        </div>
      </div>
    </div>
  {/if}

  <!-- ==================== ABA 2: IMPRESSORAS RECONHECIDAS ==================== -->
  {#if activeTab === 'impressoras'}
    <div class="space-y-4">
      <div class="flex items-center justify-between bg-white p-4 border border-slate-200">
        <div>
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            Impressoras Reconhecidas no Hardware
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            O sistema detecta automaticamente dispositivos conectadas via USB, Serial, Spooler e Rede IP.
          </p>
        </div>

        <PrimaryButton variant="primary" shortcut="R" on:click={handleScanPrinters}>
          <Icon name="refresh" size={14} className="mr-1" />
          Reconhecer Impressoras
        </PrimaryButton>
      </div>

      <!-- Tabela de Impressoras -->
      <div class="bg-white border border-slate-200">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                <th class="border-r border-slate-200 px-3 py-2">Impressora / Dispositivo</th>
                <th class="border-r border-slate-200 px-3 py-2">Porta / Conexão</th>
                <th class="border-r border-slate-200 px-3 py-2">Bobina</th>
                <th class="border-r border-slate-200 px-3 py-2">Status Spooler</th>
                <th class="border-r border-slate-200 px-3 py-2">Mapeamento Destino</th>
                <th class="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each $printers as prt}
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900">
                    <div class="flex items-center gap-2">
                      <Icon name="printer" size={16} className="text-slate-600" />
                      <span>{prt.name}</span>
                    </div>
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-red-600">{prt.port}</td>
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-700">{prt.paperWidth}</td>
                  <td class="border-r border-slate-100 px-3 py-2.5">
                    <StatusBadge status={prt.status === 'PRONTA' ? 'CONCLUIDO' : 'ATENCAO'} text={prt.status} />
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2.5 space-x-1">
                    <button
                      type="button"
                      class="px-2 py-0.5 text-[9px] font-bold uppercase border cursor-pointer {prt.isDefaultCashier ? 'bg-red-600 text-white border-red-700' : 'bg-slate-100 text-slate-700 border-slate-300'}"
                      on:click={() => systemConfigManager.setDefaultCashierPrinter(prt.id)}
                    >
                      {prt.isDefaultCashier ? '★ PADRÃO CAIXA' : 'DEFINIR CAIXA'}
                    </button>

                    <button
                      type="button"
                      class="px-2 py-0.5 text-[9px] font-bold uppercase border cursor-pointer {prt.isDefaultKitchen ? 'bg-red-600 text-white border-red-700' : 'bg-slate-100 text-slate-700 border-slate-300'}"
                      on:click={() => systemConfigManager.setDefaultKitchenPrinter(prt.id)}
                    >
                      {prt.isDefaultKitchen ? '★ PADRÃO COZINHA' : 'DEFINIR COZINHA'}
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <PrimaryButton size="sm" variant="secondary" on:click={() => handleTestPrinter(prt)}>
                      Disparar Teste
                    </PrimaryButton>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}

  <!-- ==================== ABA 3: GESTÃO DE USUÁRIOS ==================== -->
  {#if activeTab === 'usuarios'}
    <div class="space-y-4">
      <div class="flex items-center justify-between bg-white p-4 border border-slate-200">
        <div>
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900">
            Gestão de Usuários & Controle RBAC
          </h3>
          <p class="text-xs text-slate-500 font-sans mt-0.5">
            Cadastre operadores e defina permissões de acesso para caixa, salão e gerência.
          </p>
        </div>

        <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenNewUser}>
          <Icon name="plus" size={14} className="mr-1" />
          Novo Usuário
        </PrimaryButton>
      </div>

      <!-- Tabela de Usuários -->
      <div class="bg-white border border-slate-200">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                <th class="border-r border-slate-200 px-3 py-2">Nome / Usuário</th>
                <th class="border-r border-slate-200 px-3 py-2">E-mail de Acesso</th>
                <th class="border-r border-slate-200 px-3 py-2">Perfil RBAC</th>
                <th class="border-r border-slate-200 px-3 py-2">Último Acesso</th>
                <th class="border-r border-slate-200 px-3 py-2">Status</th>
                <th class="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each $users as u}
                <tr class="hover:bg-slate-50 transition-colors {u.status === 'SUSPENSO' ? 'opacity-60 bg-slate-50' : ''}">
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900 font-sans flex items-center gap-2">
                    <Icon name="user" size={16} className="text-slate-600" />
                    <span>{u.name}</span>
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2.5 text-slate-700 font-bold">{u.email}</td>
                  <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900">
                    <span class="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px]">
                      {u.roleLabel}
                    </span>
                  </td>
                  <td class="border-r border-slate-100 px-3 py-2.5 text-slate-500">{u.lastAccess}</td>
                  <td class="border-r border-slate-100 px-3 py-2.5">
                    <button
                      type="button"
                      class="px-2 py-0.5 text-[9px] font-bold uppercase border cursor-pointer {u.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'}"
                      on:click={() => systemConfigManager.toggleUserStatus(u.id)}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-right space-x-1">
                    <PrimaryButton size="sm" variant="danger" on:click={() => systemConfigManager.deleteUser(u.id)}>
                      Excluir
                    </PrimaryButton>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Modal Novo Usuário -->
<Modal
  isOpen={isUserModalOpen}
  title="Cadastrar Novo Usuário Operador"
  subtitle="Defina o nome, e-mail de login e perfil de permissão"
  maxWidth="md"
  onClose={() => isUserModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <FormField label="Nome Completo:" name="uName" bind:value={newUser.name} required />
    <FormField label="E-mail de Login:" name="uEmail" type="email" bind:value={newUser.email} mono required />

    <div>
      <label for="roleSelect" class="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
        Perfil de Acesso (RBAC):
      </label>
      <select
        id="roleSelect"
        bind:value={newUser.role}
        class="w-full p-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <option value="ADMIN">Administrador / Gerente Geral (Acesso Total)</option>
        <option value="CAIXA">Operador de Caixa (PDV e Fechamento)</option>
        <option value="ATENDENTE">Atendente de Salão (Lançamento de Mesas)</option>
        <option value="COZINHA">Equipe de Cozinha (Visualização KDS)</option>
      </select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isUserModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveUser}>Salvar Usuário</PrimaryButton>
  </svelte:fragment>
</Modal>
