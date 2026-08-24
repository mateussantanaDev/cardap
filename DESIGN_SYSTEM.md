# CARDAP ERP & VITRINE — DESIGN SYSTEM SPECIFICATION

> **Versão:** 2.0.0 (B2G Brutalist + 70/20/10 White-Label Architecture)  
> **Objetivo:** Guia definitivo de arquitetura visual e componentes reutilizáveis para alinhar a **Vitrine do Cardápio Online** e o **Sistema de Gestão ERP / Backoffice**.

---

## 1. Filosofia de Design & Princípios B2G Brutalistas

O **CARDAP** é uma plataforma de gestão de pedidos e cardápio digital de alta densidade informacional. O design prioriza a utilidade direta, velocidade de navegação, legibilidade extrema e consistência entre o cliente (Vitrine) e o operador (ERP / Gestão KDS).

### Princípios Fundamentais

| # | Princípio | Tradução Prática no Código |
|---|---|---|
| **P1** | **Regra 70 - 20 - 10** | **70%** Fundo base limpo (`#f8fafc` / `#ffffff`) · **20%** Estrutura e hierarquia neutra (`slate-200/300/900`) · **10%** Ponto focal de ação (`#dc2626` / `red-600`). |
| **P2** | **Cantos Retos (Zero Fluff)** | Reset global obriga `border-radius: 0 !important`. Proibido cartões arredondados, pílulas ou cantos redondos em botões e inputs. |
| **P3** | **Bordas de 1px em Vez de Sombras** | Separação visual feita por bordas secas de 1px (`border-slate-200` / `border-slate-300`) e fundos alternados, nunca por sombras difusas (`shadow-md`/`shadow-lg`). |
| **P4** | **Sem Emojis, Apenas Vetores SVG** | Proibido uso de emojis nativos (`🍔`, `🛵`, `📍`). Todos os ícones utilizam o componente vetorial [`Icon.svelte`](#componente-iconsvelte) (traços SVG 24x24). Proibido Lucide Icons. |
| **P5** | **Dupla Tipográfica (Sans + Mono)** | `Inter` (`font-sans`) para nomes, títulos e textos corridos. `ui-monospace / JetBrains Mono` (`font-mono`) para preços, códigos de produto (`ENT-01`), protocolos (`#ord-105`), datas e valores. |
| **P6** | **Navegação por Teclado (<kbd>)** | Botões primários e abas exibem atalhos `<kbd>↵</kbd>`, `<kbd>Esc</kbd>`, `<kbd>1</kbd>`. Anel de foco visível em `focus:ring-2 focus:ring-red-600`. |
| **P7** | **Rotas Dedicadas vs Modais** | Telas completas (Cupons, Pedidos, Conta, Loja) possuem **rotas dedicadas próprias** (`/cupons`, `/pedidos`, `/conta`, `/loja`). Modais são restritos a ações pontuais (adicionar adicionais, calcular frete). |
| **P8** | **Navegação Fluida Apple-Level** | Transições de página com `in:fly={{ y: 8, duration: 280, easing: cubicOut }}` e barras translúcidas com efeito *frosted glass* (`backdrop-blur-md bg-white/95`). |

---

## 2. Tokens de Design (Regra 70% - 20% - 10%)

```
┌─────────────────────────────────────────────────────────────┐
│ 70% BASE CANVAS (Off-White & Branco — 70% do espaço)        │
│ bg-slate-50 (#f8fafc)  |  bg-white (#ffffff)                 │
├─────────────────────────────────────────────────────────────┤
│ 20% ESTRUTURA NEUTRA (Bordas, Textos & Divisores — 20%)     │
│ border-slate-200  |  text-slate-900  |  bg-slate-100        │
├─────────────────────────────────────────────────────────────┤
│ 10% ACENTO FOCAL DE MARCA (Focal Point Action — 10%)        │
│ bg-red-600 (#dc2626)  |  text-red-600  |  border-red-600     │
└─────────────────────────────────────────────────────────────┘
```

### 2.1. Tabela de Cores

| Token Tailwind | Valor Hex | Regra 70/20/10 | Função na Interface |
|---|---|---|---|
| `bg-slate-50` | `#f8fafc` | **70% Base** | Fundo da tela/aplicação e páginas |
| `bg-white` | `#ffffff` | **70% Base** | Superfície de cards, painéis, modais e formulários |
| `bg-slate-100` | `#f1f5f9` | **20% Estrutura** | Cabeçalho de subpainéis, hover de botões e abas inativas |
| `border-slate-200` | `#e2e8f0` | **20% Estrutura** | Borda padrão de 1px em containers e tabelas |
| `border-slate-300` | `#cbd5e1` | **20% Estrutura** | Borda de inputs e botões secundários |
| `text-slate-900` | `#0f172a` | **20% Estrutura** | Texto primário, títulos e valores consolidados |
| `text-slate-600` | `#475569` | **20% Estrutura** | Texto secundário, descrições e legendas |
| `text-slate-500` | `#64748b` | **20% Estrutura** | Labels monoespaçados uppercase e códigos |
| `bg-red-600` | `#dc2626` | **10% Acento** | Botão primário (`+ ADICIONAR`, `SALVAR`), badge de quantidade, acento de aba ativa |
| `hover:bg-red-700` | `#b91c1c` | **10% Acento** | Hover de botões primários de ação |
| `text-red-600` | `#dc2626` | **10% Acento** | Preços em destaque, valores totais e protocolos ativos |

### 2.2. Tipografia

- **Sans-serif (`font-sans`)**: `Inter`, system-ui, sans-serif (`font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'`).
- **Monospace (`font-mono`)**: `ui-monospace`, `SF Mono`, `JetBrains Mono`, `Consolas`.

| Escala Tailwind | Tamanho | Aplicação Prática |
|---|---|---|
| `text-[9px]` | 9px | Teclas de atalho `<kbd>`, badges compactas |
| `text-[10px]` | 10px | Labels uppercase (`uppercase tracking-widest`), tags de protocolo |
| `text-[11px]` | 11px | Auxiliar de tabela e status chips |
| `text-xs` | 12px | Corpo de tabelas, formulários, botões |
| `text-sm` | 14px | Nomes de produtos, títulos de cards, preços |
| `text-base` | 16px | Títulos de painéis em destaque |
| `text-lg`–`text-xl` | 18–20px | Valores de comanda / totais de caixa ERP |

---

## 3. Guia de Componentes Reutilizáveis

### 3.1. Componente `Icon.svelte`

Toda a iconografia é baseada em traços vetoriais SVG de 24x24 px.

```svelte
<!-- Uso no Svelte -->
<script lang="ts">
  import Icon from '$components/Icon.svelte';
</script>

<Icon name="delivery" size={16} className="text-slate-600" />
<Icon name="burger" size={24} className="text-white" />
<Icon name="check" size={14} className="text-emerald-600" />
```

**Nomes de ícones suportados**: `location`, `info`, `delivery`, `clock`, `currency`, `utensils`, `coupon`, `orders`, `user`, `fire`, `burger`, `fries`, `cheese`, `drink`, `bottle`, `beer`, `calendar`, `credit-card`, `search`, `check`, `arrow-left`, `arrow-right`, `chevron-right`, `chevron-left`.

---

### 3.2. Componente `PrimaryButton.svelte`

Botões com cantos retos, atalhos de teclado e acento 10%.

```svelte
<PrimaryButton
  label="CONFIRMAR PEDIDO"
  variant="primary"    <!-- 'primary' | 'secondary' | 'danger' | 'accent' -->
  shortcut="↵"
  fullWidth
  on:click={handleAction}
/>
```

**Estilização das Variantes**:
- **`primary`** (10% Accent): `bg-red-600 hover:bg-red-700 text-white border border-red-700`
- **`secondary`** (20% Structure): `bg-white hover:bg-slate-100 text-slate-800 border border-slate-300`
- **`danger`**: `bg-red-900 hover:bg-red-950 text-white border border-red-900`
- **`accent`**: `bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-500`

---

### 3.3. Componente `PanelHeader.svelte`

Cabeçalho de seção com índice numérico em acento 10% e título monoespaçado.

```svelte
<PanelHeader
  title="Entradas & Acompanhamentos"
  subtitle="4 opções disponíveis no cardápio"
  index="01"
>
  <span class="font-mono text-[10px] font-bold text-red-600 uppercase">
    4 ITENS
  </span>
</PanelHeader>
```

---

### 3.4. Componente `FormField.svelte`

Input controlado com rótulo uppercase, suporte a monoespaçado e indicador de foco.

```svelte
<FormField
  label="WhatsApp / Celular do Cliente:"
  name="phone"
  type="tel"
  bind:value={customerPhone}
  placeholder="(87) 99999-8888"
  mono
  required
/>
```

---

### 3.5. Componente `ProductCardItem.svelte` / Linha de Tabela ERP

Card com thumbnail vetorial à esquerda, tags uppercase, descrição e ação.

```svelte
<div class="bg-white border-b border-slate-200 p-3.5 flex items-start justify-between gap-3.5 hover:bg-slate-50">
  <div class="w-20 h-20 bg-slate-100 border border-slate-300 shrink-0 flex items-center justify-center">
    <Icon name="burger" size={32} className="text-slate-600" />
  </div>

  <div class="flex-1 min-w-0 space-y-1">
    <span class="font-mono text-[9px] font-bold text-slate-500 uppercase">BURG-01</span>
    <h4 class="font-bold text-sm text-slate-900">Mega Monster Burguer</h4>
    <span class="font-mono text-sm font-bold text-slate-900">R$ 32,00</span>
  </div>

  <button class="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase">
    + ADICIONAR
  </button>
</div>
```

---

### 3.6. Componente `SubNav.svelte`

Navegação horizontal por abas com indicador superior na aba ativa.

```svelte
<SubNav
  tabs={[
    { id: 'ENTRADAS', label: 'Entradas', active: true, shortcut: '1' },
    { id: 'HAMBURGUER', label: 'Hamburguer', active: false, shortcut: '2' }
  ]}
  on:select={handleCategorySelect}
/>
```

---

### 3.7. Componente `BottomBarNav.svelte`

Barra de navegação inferior mobile com efeito *frosted glass* e ícones vetoriais.

```svelte
<!-- Navegação entre as 4 rotas dedicadas do aplicativo -->
<BottomBarNav
  activeTab="cardapio"   <!-- 'cardapio' | 'cupons' | 'pedidos' | 'conta' -->
  cartCount={3}
/>
```

---

## 4. Estrutura de Rotas e Navegação

Todas as visões principais possuem **rotas físicas dedicadas**, garantindo URLs compartilháveis e histórico de navegação fluido no navegador:

```
apps/vitrine/src/routes/
├── +page.svelte              # /         -> Cardápio Online / Home
├── loja/
│   └── +page.svelte          # /loja     -> Tela de Detalhes da Loja & Dados Fiscais
├── cupons/
│   └── +page.svelte          # /cupons   -> Tela de Cupons & Vouchers Promocionais
├── pedidos/
│   └── +page.svelte          # /pedidos  -> Tela de Pedidos Ativos & Histórico
├── conta/
│   └── +page.svelte          # /conta    -> Tela de Perfil do Cliente & Endereços
├── checkout/
│   └── +page.svelte          # /checkout -> Tela de Consolidação & Pagamento
└── status/[id]/
    └── +page.svelte          # /status/:id -> Rastreamento KDS em Tempo Real
```

---

## 5. Padrão de Transições Fluidas (Apple-Level Animation)

Para garantir transições entre telas sem cortes secos ou elementos pulando:

```svelte
<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
</script>

<!-- Wrapper da Tela com Transição Fluida -->
<div
  in:fly={{ y: 8, duration: 280, easing: cubicOut }}
  class="max-w-2xl mx-auto min-h-screen bg-slate-50 text-slate-900"
>
  <!-- Conteúdo da Rota -->
</div>
```

---

## 6. Checklist de Alinhamento para o Módulo ERP / Gestão

Para alinhar o sistema de **Gestão ERP (Backoffice/KDS)** com o mesmo padrão do Cardápio Online:

- [x] Aplicar a regra **70-20-10** (Fundo `bg-slate-50`, tabelas `bg-white`, acentos de ação `bg-red-600` ou `bg-blue-900`).
- [x] Forçar o reset global de cantos retos (`border-radius: 0 !important`).
- [x] Utilizar o componente [`Icon.svelte`](#componente-iconsvelte) para todos os ícones das tabelas de gestão.
- [x] Manter o padrão de tipografia: `font-sans` para nomes de clientes/produtos e `font-mono` para valores financeiros, comanda ID, CPF e protocolo.
- [x] Usar o [`PanelHeader.svelte`](#componente-panelheadersvelte) nos módulos de Caixa, Estoque, Cozinha KDS e Relatórios.
- [x] Incluir atalhos de teclado `<kbd>` nos botões de confirmação de comanda e alteração de status de pedido.
