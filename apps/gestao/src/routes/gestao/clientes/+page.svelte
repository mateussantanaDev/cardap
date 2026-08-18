<script lang="ts">
  import { onMount } from 'svelte';
  import { customerStore, type Customer } from '$stores/customerStore';
  import { tenantManager } from '$stores/tenantStore';
  import PanelHeader from '$ui/PanelHeader.svelte';
  import MetricCard from '$ui/MetricCard.svelte';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';
  import StatusBadge from '$ui/StatusBadge.svelte';
  import Modal from '$ui/Modal.svelte';
  import Icon from '$components/Icon.svelte';

  const { activeTenant } = tenantManager;

  let searchTerm = '';
  let activeTab: 'clientes' | 'evolution' | 'evocrm' = 'evocrm';
  let isAddModalOpen = false;
  let isLoadingCrm = true;

  // URL do Evolution CRM / Manager (porta 8085 do Manager ou 8080 da API)
  let evoCrmUrl = 'http://localhost:8085';
  let isCrmConnected = true;

  let apiCustomers: any[] = [];
  let vipCount = 0;

  let newCustomer: Customer = {
    id: '',
    name: '',
    phone: '',
    address: '',
    totalOrdersCount: 1,
    totalSpentCents: 4500,
    totalSpentFormatted: 'R$ 45,00',
    lastOrderDate: '17/08/2026',
    tags: ['NOVO']
  };

  async function loadCrmData() {
    try {
      isLoadingCrm = true;
      const res = await fetch('/api/crm/customers');
      const data = await res.json();
      if (data.success) {
        apiCustomers = data.customers;
        vipCount = data.vipCount || 0;
        if (apiCustomers.length > 0) {
          customerStore.setCustomers(apiCustomers.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.formattedPhone || c.phone,
            address: 'Endereço Principal',
            totalOrdersCount: c.totalOrdersCount,
            totalSpentCents: c.totalSpentCents,
            totalSpentFormatted: c.totalSpentFormatted,
            lastOrderDate: c.lastOrderDateFormatted || 'Recente',
            tags: c.tags
          })));
        }
      }
    } catch (err) {
      console.warn('[CRM UI] Usando estado local de backup do customerStore');
    } finally {
      isLoadingCrm = false;
    }
  }

  onMount(() => {
    loadCrmData();
  });

  $: filteredCustomers = $customerStore.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  // Feed de Log das Mensagens Evolution API
  const mockEvolutionMessages = [
    {
      id: 'msg-46902',
      orderId: '46902',
      customerName: 'Mateus Vieira',
      phone: '(87) 9 9603 6770',
      timestamp: '17/08/2026 08:55',
      incomingMessage: `*Espanka Burguer*

*PEDIDO #46902*
*Nome*: Mateus Vieira
*WhatsApp*: (87) 9 9603 6770
*Forma Entrega*: Delivery
*Prazo Estimado*: 17/08/2026 09:30
*Pagamento*: Cartão de Débito
*Endereço*: Águas Belas, COMUNATY, Trav Padre Nelson, 299, casa, Primeira esquina à esquerda após armazém das Petronios, casa toda branca
______________________________________

*1* Pizza PP (R$ 20.00)
   >>> Sabores <<<
    *1/1* Calabresa Especial
_Obs: (Sem cebola)_
______________________________________
*TOTAL PRODUTOS*: R$ 20,00
*TAXA DE ENTREGA*: R$ 3,00
*TOTAL FINAL*: R$ 23,00

Muito obrigado pela preferência!
_Para facilitar a entrega envie-nos a Localização Fixa do Whatsapp_

*👉Acompanhe o andamento do pedido:* https://app.cardaperp.com.br/espanka-burguer/status/46902`,
      botResponse: `Bom dia,
Espanka Burguer agradece seu contato 😃

Confira as ofertas exclusivas e faça seu pedido através do nosso Cardápio Digital, link abaixo: 👇🏻

https://app.cardaperp.com.br/espanka-burguer

*OBS: Realizando seu pedido pelo Cardápio Digital, seu pedido vai direto para a cozinha e é preparado mais rapidamente* 😉

Agradecemos a Preferência!`,
      status: 'PROCESSADO_SUCESSO'
    }
  ];

  function handleOpenAdd() {
    newCustomer = {
      id: `cli-${Date.now()}`,
      name: '',
      phone: '',
      address: '',
      totalOrdersCount: 1,
      totalSpentCents: 4500,
      totalSpentFormatted: 'R$ 45,00',
      lastOrderDate: '17/08/2026',
      tags: ['NOVO']
    };
    isAddModalOpen = true;
  }

  function handleSaveCustomer() {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) return;
    customerStore.addCustomer(newCustomer);
    isAddModalOpen = false;
  }

  function handleReloadWebview() {
    if (typeof document !== 'undefined') {
      const iframe = document.getElementById('crmIframe') as HTMLIFrameElement;
      if (iframe) iframe.src = evoCrmUrl;
    }
  }
</script>

<div class="space-y-6">
  <!-- PanelHeader do Módulo de CRM Embutido Spec 2.0.0 -->
  <div class="bg-white border border-slate-200">
    <PanelHeader
      title="Gestão de Clientes & WhatsApp CRM Embutido (Evolution CRM)"
      subtitle={`Multiatendimento, automação de robôs e sincronização com ${$activeTenant.name}`}
      index="09"
    >
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1 font-mono text-xs font-bold uppercase border cursor-pointer {activeTab === 'evocrm' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
          on:click={() => activeTab = 'evocrm'}
        >
          ⚡ Evolution CRM Embutido
        </button>

        <button
          type="button"
          class="px-3 py-1 font-mono text-xs font-bold uppercase border cursor-pointer {activeTab === 'evolution' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
          on:click={() => activeTab = 'evolution'}
        >
          Evolution API Feed
        </button>

        <button
          type="button"
          class="px-3 py-1 font-mono text-xs font-bold uppercase border cursor-pointer {activeTab === 'clientes' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}"
          on:click={() => activeTab = 'clientes'}
        >
          Base de Clientes ({$customerStore.length})
        </button>

        <PrimaryButton variant="primary" shortcut="N" on:click={handleOpenAdd}>
          <Icon name="plus" size={14} className="mr-1" />
          Novo Cliente
        </PrimaryButton>
      </div>
    </PanelHeader>
  </div>

  <!-- Status da Instância Evolution CRM & Evolution API -->
  <div class="bg-slate-900 text-white p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
    <div class="flex items-center gap-3">
      <div class="w-3 h-3 bg-emerald-500 rounded-none animate-pulse"></div>
      <div>
        <span class="font-bold text-white uppercase text-sm block">EVOLUTION CRM COMMUNITY — INTEGRADO</span>
        <span class="text-slate-400 text-[10px] block">RESTAURANTE ATIVO: {$activeTenant.name.toUpperCase()} · INSTÂNCIA: {evoCrmUrl}</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <span class="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
        MICROSERVIÇOS DOCKER: ONLINE
      </span>
      <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
        BOT AUTO-RESPONSE: ATIVO
      </span>
    </div>
  </div>

  <!-- MetricCards CRM Regra 70/20/10 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <MetricCard
      label="Total de Clientes"
      value={`${$customerStore.length} Cadastrados`}
      sublabel={`Base sincronizada no ERP (${$activeTenant.name})`}
      accent="default"
    />

    <MetricCard
      label="Clientes VIP (LTV R$ 200+)"
      value={`${vipCount} Clientes VIP`}
      sublabel="Ranqueados automaticamente pelo LTV"
      accent="success"
    />

    <MetricCard
      label="Robô de Resposta Automática"
      value="100% Bot Active"
      sublabel="Evo Bot Runtime conectado"
      accent="default"
    />
  </div>

  <!-- ABA 1: EVOLUTION CRM EMBEDDED (LIVE WEBVIEW) -->
  {#if activeTab === 'evocrm'}
    <div class="space-y-4 font-mono text-xs">
      <div class="bg-white border border-slate-200 p-4 space-y-4">
        <!-- Header de Controle do WebView -->
        <div class="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div>
            <h3 class="font-bold text-sm text-slate-900 uppercase flex items-center gap-2">
              <span class="w-2.5 h-2.5 bg-emerald-500 rounded-none animate-pulse"></span>
              WEBVIEW INTERATIVO DA SUÍTE EVOLUTION CRM
            </h3>
            <p class="text-slate-500 font-sans text-xs">
              Gerencie atendimentos, instâncias de WhatsApp e robôs de IA sem sair da tela do ERP
            </p>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 bg-slate-100 border border-slate-300 px-2 py-1 text-[11px] font-mono">
              <span class="text-slate-500 font-bold uppercase">URL:</span>
              <input
                type="text"
                bind:value={evoCrmUrl}
                class="bg-transparent text-slate-900 font-bold focus:outline-none w-48 text-xs"
              />
            </div>

            <PrimaryButton variant="secondary" size="sm" on:click={handleReloadWebview}>
              <Icon name="refresh" size={12} className="mr-1" />
              Recarregar WebView
            </PrimaryButton>

            <PrimaryButton variant="primary" size="sm" on:click={() => window.open(evoCrmUrl, '_blank')}>
              Abrir Externo ↗
            </PrimaryButton>
          </div>
        </div>

        <!-- Conteiner WebView Embutido (Live Iframe Container) -->
        <div class="border-2 border-slate-900 bg-slate-900 rounded-none shadow-[8px_8px_0_rgba(15,23,42,0.15)] flex flex-col">
          <!-- Window Bar do WebView -->
          <div class="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300 font-mono">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 bg-red-500 rounded-full inline-block"></span>
              <span class="w-3 h-3 bg-amber-500 rounded-full inline-block"></span>
              <span class="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span>
              <span class="font-bold text-white ml-2">EVOLUTION CRM COMMUNITY · WEBVIEW ACTIVE (SSO)</span>
            </div>
            <span class="text-slate-400">PAINEL INTEGRADO DE {$activeTenant.name.toUpperCase()}</span>
          </div>

          <!-- Componente Iframe / WebView Interativo -->
          <div class="relative w-full h-[720px] bg-slate-950">
            <iframe
              id="crmIframe"
              src={evoCrmUrl}
              title="Evolution CRM Suite Embedded WebView"
              class="w-full h-full border-none bg-slate-900"
              allow="camera; microphone; clipboard-read; clipboard-write;"
            ></iframe>
          </div>

          <!-- Barra de Rodapé Informativa do WebView -->
          <div class="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>⚡ Sincronização Bidirecional via Webhooks do ERP</span>
            <span class="text-emerald-400 font-bold">STATUS: STREAMING ATIVO NO WEBVIEW</span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ABA 2: FEED DE MENSAGENS EVOLUTION API -->
  {#if activeTab === 'evolution'}
    <div class="space-y-4">
      <div class="bg-white border border-slate-200 p-4">
        <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
          <h3 class="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Icon name="orders" size={16} className="text-slate-600" />
            Fluxo de Comunicação WhatsApp em Tempo Real
          </h3>
          <span class="font-mono text-[10px] text-slate-500 uppercase">WEBSOCKET LOG STREAM</span>
        </div>

        <div class="mt-4 space-y-6 font-mono text-xs">
          {#each mockEvolutionMessages as msg}
            <div class="border border-slate-300 bg-slate-50 p-4 space-y-4">
              <!-- Header do Log -->
              <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-red-600 text-sm">PEDIDO #{msg.orderId}</span>
                  <span class="text-slate-600">— {msg.customerName} ({msg.phone})</span>
                </div>
                <span class="text-slate-500 text-[10px]">{msg.timestamp}</span>
              </div>

              <!-- Grid Comparativo Mensagem Cliente vs Resposta Bot -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- 1. Mensagem Enviada pelo Cliente -->
                <div class="space-y-1.5">
                  <span class="text-[10px] font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <span>📩 Mensagem Formatada Recebida:</span>
                  </span>
                  <pre class="bg-white border border-slate-300 p-3 text-[11px] leading-relaxed text-slate-900 overflow-x-auto rounded-none whitespace-pre-wrap max-h-80">{msg.incomingMessage}</pre>
                </div>

                <!-- 2. Resposta Automática do Bot Evolution -->
                <div class="space-y-1.5">
                  <span class="text-[10px] font-bold uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                    <span>🤖 Resposta Automática Enviada pelo Bot Evolution:</span>
                  </span>
                  <pre class="bg-emerald-50 border border-emerald-300 p-3 text-[11px] leading-relaxed text-emerald-950 overflow-x-auto rounded-none whitespace-pre-wrap max-h-80">{msg.botResponse}</pre>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>Instância: {$activeTenant.name.toUpperCase()}_MAIN · Provider: Evolution API v2 / Evo CRM</span>
                <StatusBadge status="CONCLUIDO" text="PEDIDO ENVIADO À COZINHA" />
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- ABA 3: BASE DE CLIENTES -->
  {#if activeTab === 'clientes'}
    <div class="bg-white border border-slate-200 p-4 space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="w-80">
          <FormField
            label=""
            name="searchTerm"
            bind:value={searchTerm}
            placeholder="Buscar por nome ou telefone do cliente..."
            mono
          />
        </div>

        <span class="font-mono text-xs text-slate-500 uppercase">
          Exibindo {filteredCustomers.length} de {$customerStore.length} clientes ({$activeTenant.name})
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-widest">
              <th class="border-r border-slate-200 px-3 py-2">Cliente / Nome</th>
              <th class="border-r border-slate-200 px-3 py-2">Telefone / WhatsApp</th>
              <th class="border-r border-slate-200 px-3 py-2">Endereço Principal</th>
              <th class="border-r border-slate-200 px-3 py-2">Pedidos</th>
              <th class="border-r border-slate-200 px-3 py-2">Total Gasto (LTV)</th>
              <th class="border-r border-slate-200 px-3 py-2">Último Pedido</th>
              <th class="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each filteredCustomers as c}
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900 font-sans">
                  {c.name}
                  {#if c.tags.includes('VIP') || c.tags.includes('CLIENTE_VIP')}
                    <span class="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-bold">
                      VIP
                    </span>
                  {/if}
                  {#if c.tags.includes('RECORRENTE')}
                    <span class="ml-1.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[9px] font-bold">
                      RECORRENTE
                    </span>
                  {/if}
                </td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-red-600">{c.phone}</td>
                <td class="border-r border-slate-100 px-3 py-2.5 text-slate-600 font-sans max-w-xs truncate">
                  {c.address}
                </td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-bold text-slate-900">{c.totalOrdersCount} ped.</td>
                <td class="border-r border-slate-100 px-3 py-2.5 font-extrabold text-slate-900">{c.totalSpentFormatted}</td>
                <td class="border-r border-slate-100 px-3 py-2.5 text-slate-500">{c.lastOrderDate}</td>
                <td class="px-3 py-2.5 text-right space-x-1">
                  <PrimaryButton size="sm" variant="secondary" on:click={() => window.open(`https://wa.me/55${c.phone.replace(/\D/g, '')}`, '_blank')}>
                    Enviar Mensagem
                  </PrimaryButton>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Modal Novo Cliente -->
<Modal
  isOpen={isAddModalOpen}
  title="Cadastrar Novo Cliente"
  subtitle={`Informe dados de contato do cliente para ${$activeTenant.name}`}
  maxWidth="md"
  onClose={() => isAddModalOpen = false}
>
  <div class="space-y-4 font-mono text-xs">
    <FormField label="Nome Completo:" name="cName" bind:value={newCustomer.name} required />
    <FormField label="Telefone / WhatsApp:" name="cPhone" bind:value={newCustomer.phone} placeholder="(87) 99999-0000" mono required />
    <FormField label="Endereço de Entrega Completo:" name="cAddr" bind:value={newCustomer.address} placeholder="Rua, Número, Bairro, Cidade..." mono />
  </div>

  <svelte:fragment slot="footer">
    <PrimaryButton variant="secondary" on:click={() => isAddModalOpen = false}>Cancelar</PrimaryButton>
    <PrimaryButton variant="primary" on:click={handleSaveCustomer}>Salvar Cliente</PrimaryButton>
  </svelte:fragment>
</Modal>
