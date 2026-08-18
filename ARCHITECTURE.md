# CARDAP — Arquitetura de Software & Esquema de Banco de Dados (Imperius do Pastel)

> **Documento de Arquitetura Base (Clean Architecture + Monorepo + Prisma ORM)**
> **Cliente Inicial:** Lanchonete *Imperius do Pastel*

---

## 1. Visão Geral da Arquitetura

O sistema **Cardap** é projetado seguindo os princípios de **Clean Architecture**, desacoplando totalmente as regras de negócio de frameworks web (SvelteKit), ORMs (Prisma), barramentos de mensageria (Redis/BullMQ) e protocolos de tempo real (WebSockets/SSE).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APLICAÇÕES (Presentation)                          │
│     ┌────────────────────────────────┐  ┌──────────────────────────────┐     │
│     │ Cardap ERP B2B (/gestao)      │  │ Cardap Vitrine B2C (Online)  │     │
│     │ SvelteKit + Tailwind v4        │  │ SvelteKit (Mobile-First)     │     │
│     └───────────────┬────────────────┘  └──────────────┬───────────────┘     │
└─────────────────────┼──────────────────────────────────┼─────────────────────┘
                      │                                  │
┌─────────────────────▼──────────────────────────────────▼─────────────────────┐
│                     INFRAESTRUTURA & ADAPTADORES (Adapters)                  │
│  ┌──────────────────────┐ ┌─────────────────────┐ ┌──────────────────────┐  │
│  │ Prisma ORM / Postgres│ │ WebSocket Server    │ │ Redis + BullMQ Queues│  │
│  │ (Repositories Impl)  │ │ (KDS & Realtime SSE)│ │ (Ficha Técnica/Stock)│  │
│  └──────────┬───────────┘ └──────────┬──────────┘ └──────────┬───────────┘  │
└─────────────┼────────────────────────┼───────────────────────┼──────────────┘
              │                        │                       │
┌─────────────▼────────────────────────▼───────────────────────▼──────────────┐
│                        CASOS DE USO (Use Cases Layer)                        │
│   • ProcessOrderUseCase        • DeductStockOnSaleUseCase                   │
│   • OpenShiftUseCase           • CloseShiftCegoUseCase                      │
│   • GenerateTableQrTokenUseCase• DispatchDeliveryRouteUseCase               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        ENTIDADES E DOMÍNIO (Entities)                        │
│   • Order (Entity)    • Ingredient (Value Object)  • TableToken (Crypto)    │
│   • CashShift (State) • AssemblyEngine (Rules)     • RecipeFraction (Math)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Diretórios do Monorepo

Separamos as responsabilidades em um Monorepo limpo e sem bloatware. Os Use Cases e Entities residem no pacote central `@cardap/core`.

```
cardap/
├── packages/
│   ├── core/                        # Núcleo de Domínio (Clean Architecture 100% puro TS)
│   │   ├── src/
│   │   │   ├── domain/              # Camada de Entidades e Interfaces Primárias
│   │   │   │   ├── entities/        # Modelos ricos de domínio sem anotações de ORM
│   │   │   │   │   ├── user.entity.ts
│   │   │   │   │   ├── cash-shift.entity.ts
│   │   │   │   │   ├── ingredient.entity.ts
│   │   │   │   │   ├── product.entity.ts
│   │   │   │   │   ├── assembly-option.entity.ts
│   │   │   │   │   ├── table.entity.ts
│   │   │   │   │   ├── order.entity.ts
│   │   │   │   │   ├── coupon.entity.ts
│   │   │   │   │   └── delivery-zone.entity.ts
│   │   │   │   ├── value-objects/   # Objetos de Valor Imutáveis
│   │   │   │   │   ├── money.vo.ts
│   │   │   │   │   ├── qr-table-token.vo.ts
│   │   │   │   │   ├── phone-number.vo.ts
│   │   │   │   │   └── recipe-fraction.vo.ts
│   │   │   │   └── repositories/    # Interfaces dos Repositórios (Contratos)
│   │   │   │       ├── user-repository.interface.ts
│   │   │   │       ├── cash-repository.interface.ts
│   │   │   │       ├── inventory-repository.interface.ts
│   │   │   │       ├── product-repository.interface.ts
│   │   │   │       ├── table-repository.interface.ts
│   │   │   │       ├── order-repository.interface.ts
│   │   │   │       └── coupon-repository.interface.ts
│   │   │   ├── use-cases/           # Regras de Negócio da Aplicação
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login-user.use-case.ts
│   │   │   │   │   └── verify-table-jwt.use-case.ts
│   │   │   │   ├── cash/
│   │   │   │   │   ├── open-cash-shift.use-case.ts
│   │   │   │   │   ├── record-cash-movement.use-case.ts
│   │   │   │   │   └── close-cash-shift-blind.use-case.ts
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── deduct-recipe-fractions.use-case.ts
│   │   │   │   │   ├── register-batch.use-case.ts
│   │   │   │   │   └── check-minimum-stock-alerts.use-case.ts
│   │   │   │   ├── order/
│   │   │   │   │   ├── create-order-vitrine.use-case.ts
│   │   │   │   │   ├── create-order-pdv.use-case.ts
│   │   │   │   │   ├── advance-kds-status.use-case.ts
│   │   │   │   │   └── cancel-order.use-case.ts
│   │   │   │   ├── table/
│   │   │   │   │   ├── generate-table-qr-tokens.use-case.ts
│   │   │   │   │   └── update-table-status.use-case.ts
│   │   │   │   └── delivery/
│   │   │   │       ├── calculate-delivery-fee.use-case.ts
│   │   │   │       └── dispatch-route-grouping.use-case.ts
│   │   │   └── shared/              # Result, Either e Erros Customizados do Domínio
│   │   │       ├── result.ts
│   │   │       └── domain-error.ts
│   │   └── package.json
│   │
│   ├── database/                    # Infraestrutura de Dados e Persistência
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Esquema Prisma Único e Relacional
│   │   │   ├── migrations/          # Histórico de Migrações SQL
│   │   │   └── seed.ts              # Seeder Inicial (Pastéis, Insumos e Usuários Imperius)
│   │   ├── src/
│   │   │   ├── repositories/        # Implementações Concretas Prisma
│   │   │   │   ├── prisma-user.repository.ts
│   │   │   │   ├── prisma-cash.repository.ts
│   │   │   │   ├── prisma-inventory.repository.ts
│   │   │   │   ├── prisma-product.repository.ts
│   │   │   │   ├── prisma-table.repository.ts
│   │   │   │   └── prisma-order.repository.ts
│   │   │   └── client.ts            # Instância Singleton Prisma Client
│   │   └── package.json
│   │
│   └── realtime/                    # Infraestrutura Mensageria e Eventos Real-Time
│       ├── src/
│       │   ├── websocket/           # Servidor WS para KDS e Salão
│       │   ├── queues/              # Filas BullMQ (Dedução de Estoque, Impressão ESC/POS)
│       │   └── events/              # PubSub Redis para SSE e Atualização de Status Pedido
│       └── package.json
│
└── apps/
    ├── gestao/                      # Front-End ERP B2B (SvelteKit + Tailwind v4 + Brutalismo)
    │   ├── src/
    │   │   ├── lib/
    │   │   │   ├── components/      # PanelHeader, MetricCard, KdsCard, MesaCard, etc.
    │   │   │   ├── server/          # Controllers e API Endpoints acionando UseCases
    │   │   │   └── stores/          # Stores Svelte 5 para estado local de PDV
    │   │   └── routes/              # Rotas do ERP (/gestao, /gestao/pdv, /gestao/kds, etc.)
    │   └── package.json
    │
    └── vitrine/                     # Front-End B2C (SvelteKit Online Menu & QR Table)
        ├── src/
        │   ├── lib/                 # Componentes de Montagem de Pedido ("Monte seu Pastel")
        │   └── routes/              # Rotas da Vitrine (?token=..., /carrinho, /status)
        └── package.json
```

---

## 3. Esquema do Banco de Dados Prisma (schema.prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==========================================
// 1. ENUMS OPERACIONAIS E SEGURANÇA
// ==========================================

enum Role {
  ADMIN
  GERENTE
  CAIXA
  GARCOM
  COZINHA
  MOTOBOY
}

enum ShiftStatus {
  ABERTO
  FECHADO
}

enum CashTransactionType {
  SUPRIMENTO
  SANGRIA
  REFORCO
  ENTRADA_PEDIDO
}

enum OrderType {
  SALAO
  BALCAO
  DELIVERY
}

enum OrderStatus {
  PENDENTE
  RECEBIDO
  EM_PREPARO
  PRONTO
  SAIU_PARA_ENTREGA
  ENTREGUE
  CANCELADO
}

enum PaymentMethod {
  DINHEIRO
  PIX
  CARTAO_CREDITO
  CARTAO_DEBITO
  VR_VA
}

enum PaymentStatus {
  PENDENTE
  PAGO
  REEMBOLSADO
  CANCELADO
}

enum TableStatus {
  LIVRE
  OCUPADA
  CONTA_SOLICITADA
  RESERVADA
}

enum UnitOfMeasure {
  KG
  G
  L
  ML
  UN
}

enum InventoryMovementType {
  BAIXA_AUTOMATICA
  ENTRADA_NOTA_FISCAL
  PERDA_AVARIA
  AJUSTE_MANUAL
  DEVOLUCAO
}

enum DiscountType {
  PERCENTUAL
  VALOR_FIXO
}

enum DriverStatus {
  DISPONIVEL
  EM_ROTA
  INATIVO
}

// ==========================================
// 2. USUÁRIOS E RBAC (AUTENTICAÇÃO ERP)
// ==========================================

model User {
  id           String        @id @default(uuid())
  name         String
  email        String        @unique
  phone        String?
  passwordHash String
  role         Role          @default(CAIXA)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relacionamentos
  openedShifts     CashShift[]       @relation("ShiftOpenedBy")
  closedShifts     CashShift[]       @relation("ShiftClosedBy")
  cashTransactions CashTransaction[]
  inventoryLogs    InventoryMovement[]
  driverProfile    DeliveryDriver?
  sessions         UserSession[]

  @@map("users")
}

model UserSession {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_sessions")
}

// ==========================================
// 3. CAIXA & PDV (GESTÃO FINANCEIRA DE TURNO)
// ==========================================

model CashShift {
  id                  String      @id @default(uuid())
  openedByUserId      String
  closedByUserId      String?
  openedAt            DateTime    @default(now())
  closedAt            DateTime?
  initialAmount       Decimal     @db.Decimal(10, 2)
  expectedFinalAmount Decimal?    @db.Decimal(10, 2)
  actualFinalAmount   Decimal?    @db.Decimal(10, 2) // Fechamento cego informado pelo caixa
  differenceAmount    Decimal?    @db.Decimal(10, 2)
  status              ShiftStatus @default(ABERTO)
  notes               String?

  openedByUser User  @relation("ShiftOpenedBy", fields: [openedByUserId], references: [id])
  closedByUser User? @relation("ShiftClosedBy", fields: [closedByUserId], references: [id])

  transactions CashTransaction[]
  orders       Order[]

  @@map("cash_shifts")
}

model CashTransaction {
  id          String              @id @default(uuid())
  shiftId     String
  userId      String
  orderId     String?
  type        CashTransactionType
  amount      Decimal             @db.Decimal(10, 2)
  description String
  createdAt   DateTime            @default(now())

  shift CashShift @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId], references: [id])
  order Order?    @relation(fields: [orderId], references: [id])

  @@map("cash_transactions")
}

// ==========================================
// 4. INSUMOS, ESTOQUE & FICHA TÉCNICA
// ==========================================

model Ingredient {
  id           String        @id @default(uuid())
  code         String        @unique // ex: INS-001 (Carne Moída Prime)
  name         String
  unit         UnitOfMeasure
  costPrice    Decimal       @db.Decimal(10, 4) // Custo unitário por medida
  currentStock Decimal       @db.Decimal(10, 3) // ex: 25.450 kg
  minStock     Decimal       @db.Decimal(10, 3)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relacionamentos com receitas de produtos e lotes
  productRecipes   ProductRecipe[]
  assemblyOptions  AssemblyOption[]
  complementOptions ComplementOption[]
  inventoryBatches InventoryBatch[]
  movements        InventoryMovement[]

  @@map("ingredients")
}

model InventoryBatch {
  id               String    @id @default(uuid())
  ingredientId     String
  batchNumber      String    // ex: LOT-202608-01
  quantityReceived Decimal   @db.Decimal(10, 3)
  currentQuantity  Decimal   @db.Decimal(10, 3)
  expirationDate   DateTime
  supplierName     String?
  invoiceNumber    String?   // Nº Nota Fiscal Entrada
  createdAt        DateTime  @default(now())

  ingredient Ingredient          @relation(fields: [ingredientId], references: [id], onDelete: Cascade)
  movements  InventoryMovement[]

  @@map("inventory_batches")
}

model InventoryMovement {
  id           String                @id @default(uuid())
  ingredientId String
  batchId      String?
  userId       String?
  orderId      String?
  type         InventoryMovementType
  quantity     Decimal               @db.Decimal(10, 3)
  unitCost     Decimal               @db.Decimal(10, 4)
  reason       String?
  createdAt    DateTime              @default(now())

  ingredient Ingredient      @relation(fields: [ingredientId], references: [id])
  batch      InventoryBatch? @relation(fields: [batchId], references: [id])
  user       User?           @relation(fields: [userId], references: [id])
  order      Order?          @relation(fields: [orderId], references: [id])

  @@map("inventory_movements")
}

// ==========================================
// 5. CATALOGO, MOTOR DE MONTAGEM E COMPLEMENTOS
// ==========================================

model Category {
  id          String    @id @default(uuid())
  name        String    // ex: "Pastéis Tradicionais", "Monte Seu Pastel"
  slug        String    @unique
  description String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  showInB2C   Boolean   @default(true)
  showInB2B   Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  products Product[]

  @@map("categories")
}

model Product {
  id          String   @id @default(uuid())
  categoryId  String
  code        String   @unique // ex: PAST-01
  name        String   // ex: "Pastel de Carne Especial", "Monte Seu Pastel 20cm"
  description String?
  price       Decimal  @db.Decimal(10, 2)
  imageUrl    String?
  isAssembly  Boolean  @default(false) // Se utiliza o motor de montagem por etapas
  isActive    Boolean  @default(true)
  showInB2C   Boolean  @default(true)
  showInB2B   Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category Category @relation(fields: [categoryId], references: [id])

  // Ficha técnica simples (para produtos diretos)
  recipe ProductRecipe[]

  // Motor de montagem por etapas (para produtos customizáveis)
  assemblyGroups AssemblyGroup[]

  // Complementos adicionais (iFood style)
  complementGroups ComplementGroup[]

  orderItems OrderItem[]

  @@map("products")
}

// Ficha técnica direta do produto (Baixa de frações de insumo ao vender)
model ProductRecipe {
  id             String  @id @default(uuid())
  productId      String
  ingredientId   String
  quantityNeeded Decimal @db.Decimal(10, 4) // Quantidade exata g/ml/kg usada por unidade vendida

  product    Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  ingredient Ingredient @relation(fields: [ingredientId], references: [id])

  @@unique([productId, ingredientId])
  @@map("product_recipes")
}

// Etapas do Motor de Montagem (ex: "Etapa 1: Escolha a Massa", "Etapa 2: Recheio Principal")
model AssemblyGroup {
  id          String  @id @default(uuid())
  productId   String
  name        String
  minQuantity Int     @default(1)
  maxQuantity Int     @default(1)
  isRequired  Boolean @default(true)
  sortOrder   Int     @default(0)

  product Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  options AssemblyOption[]

  @@map("assembly_groups")
}

model AssemblyOption {
  id              String   @id @default(uuid())
  assemblyGroupId String
  ingredientId    String?  // Vinculado ao insumo para baixa de estoque automática
  name            String   // ex: "Carne Moída", "Queijo Catupiry Original"
  priceAdjustment Decimal  @default(0.00) @db.Decimal(10, 2)
  isDefault       Boolean  @default(false)
  isActive        Boolean  @default(true)

  group      AssemblyGroup @relation(fields: [assemblyGroupId], references: [id], onDelete: Cascade)
  ingredient Ingredient?    @relation(fields: [ingredientId], references: [id])

  selectedInItems OrderItemAssembly[]

  @@map("assembly_options")
}

// Grupos de Complementos Avulsos (ex: "Bebida Acompanhamento", "Molho Especial Extra")
model ComplementGroup {
  id          String  @id @default(uuid())
  productId   String
  name        String
  minQuantity Int     @default(0)
  maxQuantity Int     @default(5)
  isRequired  Boolean @default(false)

  product Product            @relation(fields: [productId], references: [id], onDelete: Cascade)
  options ComplementOption[]

  @@map("complement_groups")
}

model ComplementOption {
  id                String   @id @default(uuid())
  complementGroupId String
  ingredientId      String?
  name              String
  price             Decimal  @db.Decimal(10, 2)
  isActive          Boolean  @default(true)

  group      ComplementGroup @relation(fields: [complementGroupId], references: [id], onDelete: Cascade)
  ingredient Ingredient?     @relation(fields: [ingredientId], references: [id])

  selectedInItems OrderItemComplement[]

  @@map("complement_options")
}

// ==========================================
// 6. MESAS & ATENDIMENTO SALÃO (QR JWT SIGNED)
// ==========================================

model Table {
  id                String      @id @default(uuid())
  number            Int         @unique // Nº da Mesa (ex: Mesa 01)
  capacity          Int         @default(4)
  qrTokenSignature  String      @unique // Token HMAC/JWT assinado persistentemente no backend
  qrCodeUrl         String?
  status            TableStatus @default(LIVRE)
  activeOrderTotal  Decimal     @default(0.00) @db.Decimal(10, 2)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  orders Order[]

  @@map("tables")
}

// ==========================================
// 7. CLIENTES, ENTREGAS E CUPONS (CRM & B2C)
// ==========================================

model Customer {
  id                 String   @id @default(uuid())
  phone              String   @unique // Loginless via WhatsApp (OTP)
  name               String?
  cpf                String?
  email              String?
  addressStreet      String?
  addressNumber      String?
  addressComplement  String?
  addressNeighborhood String?
  addressCity        String?
  addressState       String?
  addressZipCode     String?
  latitude           Float?
  longitude          Float?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  orders Order[]

  @@map("customers")
}

model DeliveryZone {
  id                  String  @id @default(uuid())
  name                String  // ex: "Zona Central (Até 3km)", "Bairro Nobre"
  polygonGeoJson      String? // Dados poligonais GeoJSON
  maxDistanceKm       Decimal @db.Decimal(5, 2)
  deliveryFee         Decimal @db.Decimal(10, 2)
  estimatedSlaMinutes Int     @default(30)
  isActive            Boolean @default(true)

  @@map("delivery_zones")
}

model DeliveryDriver {
  id             String       @id @default(uuid())
  userId         String       @unique
  name           String
  phone          String
  vehiclePlate   String?
  status         DriverStatus @default(DISPONIVEL)
  fixedDailyRate Decimal      @default(0.00) @db.Decimal(10, 2)
  perDeliveryFee Decimal      @default(0.00) @db.Decimal(10, 2)
  isActive       Boolean      @default(true)

  user   User    @relation(fields: [userId], references: [id])
  orders Order[]

  @@map("delivery_drivers")
}

model Coupon {
  id               String       @id @default(uuid())
  code             String       @unique // ex: IMPERIUS10
  description      String?
  discountType     DiscountType
  discountValue    Decimal      @db.Decimal(10, 2)
  minOrderValue    Decimal?     @db.Decimal(10, 2)
  maxDiscountValue Decimal?     @db.Decimal(10, 2)
  startDate        DateTime
  endDate          DateTime
  usageLimit       Int?
  currentUsages    Int          @default(0)
  isActive         Boolean      @default(true)
  createdAt        DateTime     @default(now())

  orders Order[]

  @@map("coupons")
}

// ==========================================
// 8. PEDIDOS, ITENS & KDS (CANAL UNIFICADO)
// ==========================================

model Order {
  id                   String        @id @default(uuid())
  orderNumber          Int           // Número sequencial diário do pedido (ex: #102)
  type                 OrderType
  status               OrderStatus   @default(PENDENTE)
  paymentMethod        PaymentMethod
  paymentStatus        PaymentStatus @default(PENDENTE)
  subtotal             Decimal       @db.Decimal(10, 2)
  deliveryFee          Decimal       @default(0.00) @db.Decimal(10, 2)
  discountAmount       Decimal       @default(0.00) @db.Decimal(10, 2)
  totalAmount          Decimal       @db.Decimal(10, 2)
  notes                String?

  customerId           String?
  tableId              String?
  shiftId              String
  couponId             String?
  driverId             String?

  slaEstimatedMinutes  Int           @default(20)
  preparedAt           DateTime?
  dispatchedAt         DateTime?
  deliveredAt          DateTime?
  cancelledAt          DateTime?
  cancellationReason   String?

  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  customer Customer?       @relation(fields: [customerId], references: [id])
  table    Table?          @relation(fields: [tableId], references: [id])
  shift    CashShift       @relation(fields: [shiftId], references: [id])
  coupon   Coupon?         @relation(fields: [couponId], references: [id])
  driver   DeliveryDriver? @relation(fields: [driverId], references: [id])

  items             OrderItem[]
  cashTransactions  CashTransaction[]
  inventoryMovements InventoryMovement[]
  kdsTicket         KdsTicket?

  @@map("orders")
}

model OrderItem {
  id         String  @id @default(uuid())
  orderId    String
  productId  String
  quantity   Int
  unitPrice  Decimal @db.Decimal(10, 2)
  totalPrice Decimal @db.Decimal(10, 2)
  notes      String?

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  assemblies  OrderItemAssembly[]
  complements OrderItemComplement[]

  @@map("order_items")
}

model OrderItemAssembly {
  id               String  @id @default(uuid())
  orderItemId      String
  assemblyOptionId String
  name             String  // Cópia histórica do nome
  priceAdjustment  Decimal @db.Decimal(10, 2)
  quantity         Int     @default(1)

  orderItem      OrderItem      @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  assemblyOption AssemblyOption @relation(fields: [assemblyOptionId], references: [id])

  @@map("order_item_assemblies")
}

model OrderItemComplement {
  id                 String  @id @default(uuid())
  orderItemId        String
  complementOptionId String
  name               String  // Cópia histórica do nome
  price              Decimal @db.Decimal(10, 2)
  quantity           Int     @default(1)

  orderItem        OrderItem        @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  complementOption ComplementOption @relation(fields: [complementOptionId], references: [id])

  @@map("order_item_complements")
}

model KdsTicket {
  id           String    @id @default(uuid())
  orderId      String    @unique
  status       OrderStatus @default(RECEBIDO)
  kitchenNotes String?
  startedAt    DateTime?
  finishedAt   DateTime?
  slaSeconds   Int       @default(1200) // 20 minutos de SLA padrão

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@map("kds_tickets")
}
```

---

## 4. Exemplo de Isolamento: Clean Architecture na Prática

### Entidade de Domínio Puro (`packages/core/src/domain/entities/order.entity.ts`)

```typescript
export type OrderStatus = 'PENDENTE' | 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';

export interface OrderProps {
  id: string;
  orderNumber: number;
  type: 'SALAO' | 'BALCAO' | 'DELIVERY';
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  tableId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export class OrderEntity {
  private props: OrderProps;

  constructor(props: OrderProps) {
    this.validate(props);
    this.props = props;
  }

  private validate(props: OrderProps): void {
    if (props.items.length === 0) {
      throw new Error("Um pedido deve possuir ao menos um item.");
    }
    if (props.totalAmount < 0) {
      throw new Error("O valor total do pedido não pode ser negativo.");
    }
  }

  public advanceStatus(nextStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDENTE: ['RECEBIDO', 'CANCELADO'],
      RECEBIDO: ['EM_PREPARO', 'CANCELADO'],
      EM_PREPARO: ['PRONTO', 'CANCELADO'],
      PRONTO: ['SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'],
      SAIU_PARA_ENTREGA: ['ENTREGUE', 'CANCELADO'],
      ENTREGUE: [],
      CANCELADO: []
    };

    if (!validTransitions[this.props.status].includes(nextStatus)) {
      throw new Error(`Transição de status inválida: de ${this.props.status} para ${nextStatus}`);
    }

    this.props.status = nextStatus;
  }

  public get id(): string { return this.props.id; }
  public get status(): OrderStatus { return this.props.status; }
  public get totalAmount(): number { return this.props.totalAmount; }
}
```

### Caso de Uso de Baixa de Insumo por Venda (`packages/core/src/use-cases/inventory/deduct-recipe-fractions.use-case.ts`)

```typescript
import { IInventoryRepository } from '../../domain/repositories/inventory-repository.interface';
import { IProductRepository } from '../../domain/repositories/product-repository.interface';

export interface DeductStockInput {
  orderId: string;
  items: Array<{
    productId: string;
    quantity: number;
    assemblyOptionIds?: string[];
    complementOptionIds?: string[];
  }>;
}

export class DeductStockOnSaleUseCase {
  constructor(
    private inventoryRepo: IInventoryRepository,
    private productRepo: IProductRepository
  ) {}

  async execute(input: DeductStockInput): Promise<void> {
    for (const item of input.items) {
      // 1. Baixar insumos da Ficha Técnica do Produto Direto
      const productRecipe = await this.productRepo.getRecipeByProductId(item.productId);
      for (const recipeItem of productRecipe) {
        const totalFractionNeeded = Number(recipeItem.quantityNeeded) * item.quantity;
        await this.inventoryRepo.deductIngredientStock({
          ingredientId: recipeItem.ingredientId,
          quantity: totalFractionNeeded,
          reason: `Venda Pedido #${input.orderId}`,
          orderId: input.orderId
        });
      }

      // 2. Baixar insumos das opções de montagem selecionadas
      if (item.assemblyOptionIds && item.assemblyOptionIds.length > 0) {
        for (const optionId of item.assemblyOptionIds) {
          const option = await this.productRepo.getAssemblyOptionById(optionId);
          if (option && option.ingredientId) {
            await this.inventoryRepo.deductIngredientStock({
              ingredientId: option.ingredientId,
              quantity: item.quantity * 1, // fração base da opção
              reason: `Venda Montagem Pedido #${input.orderId}`,
              orderId: input.orderId
            });
          }
        }
      }
    }
  }
}
```
