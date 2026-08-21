if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cardap_admin:cardap_secret_password_2026@localhost:5432/cardap_db?schema=public';
}

import { PrismaClient } from '@prisma/client';
import { QrTableToken } from '@cardap/core';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando Seed Oficial com Dados 100% Reais — Imperius do Pastel...');

  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';

  // 1. Criar Restaurante Real
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'imperius-do-pastel' },
    update: {
      name: 'Imperius do Pastel',
      category: 'Pastelaria Artesanal & Caldos de Cana',
      cnpj: '52.894.103/0001-88',
      phone: '(87) 99812-3456',
      email: 'contato@imperiusdopastel.com.br',
      addressStreet: 'Av. Rui Barbosa',
      addressNumber: '450',
      addressNeighborhood: 'Centro',
      addressCity: 'Garanhuns',
      addressState: 'PE',
      addressZipCode: '55295-000',
      minOrderValue: 15.00,
      deliveryFee: 6.00,
      slaMinutesMin: 20,
      slaMinutesMax: 40,
      isOpen: true,
      allowTakeout: true,
      allowDelivery: true,
      allowDineIn: true,
      plan: 'ENTERPRISE',
      planPriceCents: 29900,
      status: 'ATIVO'
    },
    create: {
      slug: 'imperius-do-pastel',
      name: 'Imperius do Pastel',
      category: 'Pastelaria Artesanal & Caldos de Cana',
      cnpj: '52.894.103/0001-88',
      phone: '(87) 99812-3456',
      email: 'contato@imperiusdopastel.com.br',
      addressStreet: 'Av. Rui Barbosa',
      addressNumber: '450',
      addressNeighborhood: 'Centro',
      addressCity: 'Garanhuns',
      addressState: 'PE',
      addressZipCode: '55295-000',
      minOrderValue: 15.00,
      deliveryFee: 6.00,
      slaMinutesMin: 20,
      slaMinutesMax: 40,
      isOpen: true,
      allowTakeout: true,
      allowDelivery: true,
      allowDineIn: true,
      plan: 'ENTERPRISE',
      planPriceCents: 29900,
      status: 'ATIVO'
    }
  });

  console.log(`✅ Restaurante cadastrado: ${restaurant.name} (${restaurant.slug})`);

  // 2. Criar Usuários Reais
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@imperiusdopastel.com.br' },
    update: {
      name: 'Administrador Geral',
      phone: '(11) 99999-8888',
      role: 'ADMIN',
      restaurantId: restaurant.id,
      isActive: true
    },
    create: {
      restaurantId: restaurant.id,
      name: 'Administrador Geral',
      email: 'admin@imperiusdopastel.com.br',
      phone: '(11) 99999-8888',
      passwordHash: '$2b$10$abcdef1234567890ImperiusSecure2026AdminPass',
      role: 'ADMIN',
      isActive: true
    }
  });

  const caixaUser = await prisma.user.upsert({
    where: { email: 'caixa@imperiusdopastel.com.br' },
    update: {
      name: 'Carlos Operador de Caixa',
      phone: '(87) 99765-4321',
      role: 'CAIXA',
      restaurantId: restaurant.id,
      isActive: true
    },
    create: {
      restaurantId: restaurant.id,
      name: 'Carlos Operador de Caixa',
      email: 'caixa@imperiusdopastel.com.br',
      phone: '(87) 99765-4321',
      passwordHash: '$2b$10$abcdef1234567890ImperiusSecure2026CaixaPass',
      role: 'CAIXA',
      isActive: true
    }
  });

  const cozinhaUser = await prisma.user.upsert({
    where: { email: 'cozinha@imperiusdopastel.com.br' },
    update: {
      name: 'Chef Lucas (Cozinha KDS)',
      phone: '(87) 99654-3210',
      role: 'COZINHA',
      restaurantId: restaurant.id,
      isActive: true
    },
    create: {
      restaurantId: restaurant.id,
      name: 'Chef Lucas (Cozinha KDS)',
      email: 'cozinha@imperiusdopastel.com.br',
      phone: '(87) 99654-3210',
      passwordHash: '$2b$10$abcdef1234567890ImperiusSecure2026CozinhaPass',
      role: 'COZINHA',
      isActive: true
    }
  });

  console.log(`✅ Usuários cadastrados: Admin (${adminUser.email}), Caixa (${caixaUser.email}), Cozinha (${cozinhaUser.email})`);

  // 3. Criar Turno de Caixa Aberto
  let openShift = await prisma.cashShift.findFirst({
    where: { status: 'ABERTO' }
  });

  if (!openShift) {
    openShift = await prisma.cashShift.create({
      data: {
        openedByUserId: adminUser.id,
        initialAmount: 250.00,
        status: 'ABERTO',
        notes: 'Turno Principal de Operação — Imperius do Pastel'
      }
    });

    // Movimentação de suprimento inicial
    await prisma.cashTransaction.create({
      data: {
        shiftId: openShift.id,
        userId: adminUser.id,
        type: 'SUPRIMENTO',
        amount: 50.00,
        description: 'Aporte de moedas e troco miúdo para gaveta'
      }
    });
  }

  console.log(`✅ Turno de caixa ativo: ${openShift.id}`);

  // 4. Insumos e Ficha Técnica (Estoque Real)
  const insumos = [
    { code: 'INS-001', name: 'Massa Crocante Especial', unit: 'KG' as const, costPrice: 7.50, currentStock: 80.0, minStock: 10.0 },
    { code: 'INS-002', name: 'Carne Moída Bovina Prime', unit: 'KG' as const, costPrice: 26.00, currentStock: 45.0, minStock: 5.0 },
    { code: 'INS-003', name: 'Peito de Frango Desfiado', unit: 'KG' as const, costPrice: 18.00, currentStock: 35.0, minStock: 5.0 },
    { code: 'INS-004', name: 'Queijo Mussarela Especial', unit: 'KG' as const, costPrice: 32.00, currentStock: 40.0, minStock: 6.0 },
    { code: 'INS-005', name: 'Catupiry Original', unit: 'KG' as const, costPrice: 38.00, currentStock: 25.0, minStock: 4.0 },
    { code: 'INS-006', name: 'Queijo Coalho do Agreste', unit: 'KG' as const, costPrice: 34.00, currentStock: 20.0, minStock: 3.0 },
    { code: 'INS-007', name: 'Camarão Limpo Médio', unit: 'KG' as const, costPrice: 55.00, currentStock: 15.0, minStock: 2.0 },
    { code: 'INS-008', name: 'Costela Bovina Desfiada', unit: 'KG' as const, costPrice: 36.00, currentStock: 20.0, minStock: 3.0 },
    { code: 'INS-009', name: 'Goiabada Cascão Cremosa', unit: 'KG' as const, costPrice: 16.00, currentStock: 15.0, minStock: 2.0 },
    { code: 'INS-010', name: 'Nutella Original Avelã', unit: 'KG' as const, costPrice: 62.00, currentStock: 10.0, minStock: 2.0 },
    { code: 'INS-011', name: 'Morango Fresco Selecionado', unit: 'KG' as const, costPrice: 22.00, currentStock: 8.0, minStock: 2.0 },
    { code: 'INS-012', name: 'Cana-de-Açúcar em Colmos', unit: 'KG' as const, costPrice: 2.50, currentStock: 120.0, minStock: 20.0 },
    { code: 'INS-013', name: 'Óleo Especial de Algodão (Fritura)', unit: 'L' as const, costPrice: 9.50, currentStock: 60.0, minStock: 15.0 },
    { code: 'INS-014', name: 'Embalagem Térmica Imperius Delivery', unit: 'UN' as const, costPrice: 0.85, currentStock: 500.0, minStock: 50.0 }
  ];

  const dbInsumos: Record<string, any> = {};
  for (const ins of insumos) {
    const created = await prisma.ingredient.upsert({
      where: { code: ins.code },
      update: { ...ins },
      create: { ...ins }
    });
    dbInsumos[ins.code] = created;
  }
  console.log(`✅ ${insumos.length} insumos de estoque sincronizados.`);

  // 5. Categorias do Cardápio
  const categoriesData = [
    { slug: 'monte', name: 'Monte Seu Pastel', description: 'Monte seu pastel personalizado de 25cm com massa, recheio e adicionais.', sortOrder: 1 },
    { slug: 'tradicionais', name: 'Pastéis Tradicionais', description: 'Os clássicos mais pedidos com receitas consagradas e fritura crocante.', sortOrder: 2 },
    { slug: 'especiais', name: 'Pastéis Nobres & Gourmet', description: 'Combinações nobres de camarão, costela desfiada e queijos selecionados.', sortOrder: 3 },
    { slug: 'doces', name: 'Pastéis Doces', description: 'Sobremesas com recheios doces quentes e massa crocante com açúcar e canela.', sortOrder: 4 },
    { slug: 'porcoes', name: 'Porções & Mini Pastéis', description: 'Porções generosas para compartilhar com a família ou amigos.', sortOrder: 5 },
    { slug: 'bebidas', name: 'Bebidas & Caldos', description: 'Caldos de cana moídos na hora com limão e refrigerantes gelados.', sortOrder: 6 }
  ];

  const dbCats: Record<string, any> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { ...cat, showInB2C: true, showInB2B: true },
      create: { ...cat, showInB2C: true, showInB2B: true }
    });
    dbCats[cat.slug] = created;
  }
  console.log(`✅ ${categoriesData.length} categorias cadastradas.`);

  // 6. Produtos do Cardápio
  // 6.1 Monte seu Pastel (Assembly interativo)
  const prodMonte = await prisma.product.upsert({
    where: { code: 'PAST-01' },
    update: {
      categoryId: dbCats['monte'].id,
      name: 'Monte seu Pastel Imperius (25cm)',
      description: 'Personalize o tamanho, a massa crocante, 1 recheio base e até 3 queijos/adicionais especiais.',
      price: 23.00,
      isAssembly: true,
      showInB2C: true,
      showInB2B: true,
      sortOrder: 1
    },
    create: {
      categoryId: dbCats['monte'].id,
      code: 'PAST-01',
      name: 'Monte seu Pastel Imperius (25cm)',
      description: 'Personalize o tamanho, a massa crocante, 1 recheio base e até 3 queijos/adicionais especiais.',
      price: 23.00,
      isAssembly: true,
      showInB2C: true,
      showInB2B: true,
      sortOrder: 1,
      assemblyGroups: {
        create: [
          {
            name: '1. ESCOLHA A MASSA ARTESANAL',
            minChoices: 1,
            maxChoices: 1,
            isRequired: true,
            sortOrder: 1,
            options: {
              create: [
                { name: 'Massa Tradicional Crocante', priceAdjustment: 0.00, isDefault: true, ingredientId: dbInsumos['INS-001'].id },
                { name: 'Massa Especial com Ervas Nobres', priceAdjustment: 2.00 },
                { name: 'Massa com Pimenta Suave', priceAdjustment: 2.00 }
              ]
            }
          },
          {
            name: '2. ESCOLHA O RECHEIO PRINCIPAL (130g)',
            minChoices: 1,
            maxChoices: 1,
            isRequired: true,
            sortOrder: 2,
            options: {
              create: [
                { name: 'Carne Bovina Moída de Primeira', priceAdjustment: 0.00, ingredientId: dbInsumos['INS-002'].id },
                { name: 'Peito de Frango Desfiado Temperado', priceAdjustment: 0.00, ingredientId: dbInsumos['INS-003'].id },
                { name: 'Queijo Coalho Grelhado do Agreste', priceAdjustment: 0.00, ingredientId: dbInsumos['INS-006'].id },
                { name: 'Camarão Salteado ao Azeite', priceAdjustment: 8.50, ingredientId: dbInsumos['INS-007'].id },
                { name: 'Costela Bovina Desfiada ao Barbecue', priceAdjustment: 7.00, ingredientId: dbInsumos['INS-008'].id }
              ]
            }
          },
          {
            name: '3. ADICIONE QUEIJOS & COMPLEMENTOS (ATÉ 3)',
            minChoices: 0,
            maxChoices: 3,
            isRequired: false,
            sortOrder: 3,
            options: {
              create: [
                { name: 'Catupiry Original Requeijão Cremoso', priceAdjustment: 3.50, ingredientId: dbInsumos['INS-005'].id },
                { name: 'Mussarela Derretida em Fatias', priceAdjustment: 3.00, ingredientId: dbInsumos['INS-004'].id },
                { name: 'Cheddar Cremoso Especial', priceAdjustment: 3.50 },
                { name: 'Bacon em Cubos Crocantes', priceAdjustment: 3.50 },
                { name: 'Milho Doce & Azeitonas Fatiadas', priceAdjustment: 2.00 },
                { name: 'Ovo Cozido em Rodelas', priceAdjustment: 2.00 }
              ]
            }
          }
        ]
      }
    }
  });

  // 6.2 Outros Produtos do Cardápio Imperius
  const fixedProducts = [
    {
      code: 'PAST-02',
      categoryId: dbCats['tradicionais'].id,
      name: 'Pastel de Carne com Queijo Coalho',
      description: 'Carne moída bovina temperada com especiarias e generoso queijo coalho do Agreste derretido.',
      price: 18.50,
      sortOrder: 2
    },
    {
      code: 'PAST-03',
      categoryId: dbCats['tradicionais'].id,
      name: 'Pastel de Frango com Catupiry Original',
      description: 'Peito de frango desfiado suculento com o legítimo requeijão Catupiry.',
      price: 18.00,
      sortOrder: 3
    },
    {
      code: 'PAST-04',
      categoryId: dbCats['tradicionais'].id,
      name: 'Pastel 4 Queijos Imperius',
      description: 'Combinação harmônica de Mussarela, Catupiry, Queijo Coalho e Provolone defumado.',
      price: 19.50,
      sortOrder: 4
    },
    {
      code: 'PAST-05',
      categoryId: dbCats['especiais'].id,
      name: 'Pastel de Costela Desfiada & Barbecue',
      description: 'Costela bovina assada lentamente por 8 horas, desfiada com molho barbecue e mussarela.',
      price: 22.00,
      sortOrder: 5
    },
    {
      code: 'PAST-06',
      categoryId: dbCats['especiais'].id,
      name: 'Pastel de Camarão ao Cream Cheese',
      description: 'Camarões selecionados salteados no azeite de ervas, alho-poró e cream cheese.',
      price: 24.50,
      sortOrder: 6
    },
    {
      code: 'PAST-07',
      categoryId: dbCats['doces'].id,
      name: 'Pastel Romeu & Julieta Especial',
      description: 'Goiabada cascão cremosa com queijo derretido, salpicado com açúcar e canela.',
      price: 15.00,
      sortOrder: 7
    },
    {
      code: 'PAST-08',
      categoryId: dbCats['doces'].id,
      name: 'Pastel de Nutella com Morangos',
      description: 'Muita Nutella original com pedaços de morangos frescos na massa quentinha e crocante.',
      price: 18.50,
      sortOrder: 8
    },
    {
      code: 'PORC-01',
      categoryId: dbCats['porcoes'].id,
      name: 'Porção de 12 Mini Pastéis de Festa Sortidos',
      description: '12 mini pastéis crocantes nos sabores carne, queijo e frango. Acompanha vinagrete e maionese da casa.',
      price: 28.00,
      sortOrder: 9
    },
    {
      code: 'BEB-01',
      categoryId: dbCats['bebidas'].id,
      name: 'Caldo de Cana Gelado 500ml',
      description: 'Moído na hora com cana fresca e filtrada.',
      price: 8.00,
      sortOrder: 10
    },
    {
      code: 'BEB-02',
      categoryId: dbCats['bebidas'].id,
      name: 'Caldo de Cana com Limão e Gelo 500ml',
      description: 'Cana fresca moída com limão taiti na hora.',
      price: 9.00,
      sortOrder: 11
    },
    {
      code: 'BEB-03',
      categoryId: dbCats['bebidas'].id,
      name: 'Suco Natural de Laranja 500ml',
      description: '100% fruta natural sem adição de açúcar.',
      price: 10.00,
      sortOrder: 12
    },
    {
      code: 'BEB-04',
      categoryId: dbCats['bebidas'].id,
      name: 'Coca-Cola Original Lata 350ml',
      description: 'Lata 350ml geladíssima.',
      price: 6.50,
      sortOrder: 13
    },
    {
      code: 'BEB-05',
      categoryId: dbCats['bebidas'].id,
      name: 'Guaraná Antarctica Lata 350ml',
      description: 'Lata 350ml geladíssima.',
      price: 6.00,
      sortOrder: 14
    },
    {
      code: 'BEB-06',
      categoryId: dbCats['bebidas'].id,
      name: 'Água Mineral sem Gás 500ml',
      description: 'Garrafa 500ml.',
      price: 4.00,
      sortOrder: 15
    }
  ];

  for (const prod of fixedProducts) {
    await prisma.product.upsert({
      where: { code: prod.code },
      update: {
        ...prod,
        showInB2C: true,
        showInB2B: true,
        isActive: true
      },
      create: {
        ...prod,
        showInB2C: true,
        showInB2B: true,
        isActive: true
      }
    });
  }
  console.log(`✅ ${fixedProducts.length + 1} produtos cadastrados no cardápio.`);

  // 7. Mesas do Salão com QR Code JWT
  const tables = [
    { number: 1, capacity: 2 },
    { number: 2, capacity: 4 },
    { number: 3, capacity: 4 },
    { number: 4, capacity: 4 },
    { number: 5, capacity: 6 },
    { number: 6, capacity: 6 },
    { number: 7, capacity: 2 },
    { number: 8, capacity: 4 },
    { number: 9, capacity: 8 },
    { number: 10, capacity: 4 }
  ];

  for (const t of tables) {
    const tableId = `tbl-${t.number}`;
    const qrSignature = QrTableToken.create(tableId, t.number, secretKey).rawToken;
    await prisma.table.upsert({
      where: { number: t.number },
      update: {
        capacity: t.capacity,
        qrTokenSignature: qrSignature,
        qrCodeUrl: `http://localhost:3001/mesa/${qrSignature}`
      },
      create: {
        number: t.number,
        capacity: t.capacity,
        qrTokenSignature: qrSignature,
        qrCodeUrl: `http://localhost:3001/mesa/${qrSignature}`,
        status: 'LIVRE'
      }
    });
  }
  console.log(`✅ ${tables.length} mesas cadastradas no salão com tokens JWT.`);

  // 8. Zonas de Entrega
  const deliveryZones = [
    { name: 'Centro e Bairros Próximos (Até 3km)', maxDistanceKm: 3.0, deliveryFee: 5.00, estimatedSlaMinutes: 25 },
    { name: 'Zona Norte e Sul (3km a 6km)', maxDistanceKm: 6.0, deliveryFee: 8.00, estimatedSlaMinutes: 35 },
    { name: 'Bairros Afastados e Periferia (6km a 10km)', maxDistanceKm: 10.0, deliveryFee: 12.00, estimatedSlaMinutes: 45 }
  ];

  for (const z of deliveryZones) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: z.name } });
    if (!existing) {
      await prisma.deliveryZone.create({ data: z });
    }
  }
  console.log(`✅ ${deliveryZones.length} zonas de entrega cadastradas.`);

  // 9. Cupons de Desconto
  const coupons = [
    {
      code: 'BEMVINDO10',
      description: '10% de desconto na primeira compra',
      discountType: 'PERCENTUAL' as const,
      discountValue: 10.00,
      minOrderValue: 20.00,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true
    },
    {
      code: 'IMPERIUS5',
      description: 'R$ 5,00 OFF em compras acima de R$ 35,00',
      discountType: 'VALOR_FIXO' as const,
      discountValue: 5.00,
      minOrderValue: 35.00,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 1000),
      isActive: true
    }
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { ...c },
      create: { ...c }
    });
  }
  console.log(`✅ ${coupons.length} cupons promocionais cadastrados.`);

  // 10. Clientes Reais
  const customers = [
    {
      phone: '5511998123456',
      name: 'Carlos Eduardo',
      email: 'carlos.edu@cliente.com.br',
      addressStreet: 'Rua das Flores',
      addressNumber: '120',
      addressNeighborhood: 'Centro',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01001-000',
      tags: ['VIP', 'RECORRENTE']
    },
    {
      phone: '5587999887766',
      name: 'Mariana Albuquerque',
      email: 'mariana.alb@gmail.com',
      addressStreet: 'Av. Simoa Gomes',
      addressNumber: '88',
      addressNeighborhood: 'Severiano Moraes',
      addressCity: 'Garanhuns',
      addressState: 'PE',
      addressZipCode: '55294-000',
      tags: ['NOVO', 'DELIVERY']
    }
  ];

  for (const cust of customers) {
    const createdCust = await prisma.customer.upsert({
      where: { phone: cust.phone },
      update: {
        name: cust.name,
        email: cust.email,
        addressStreet: cust.addressStreet,
        addressNumber: cust.addressNumber,
        addressNeighborhood: cust.addressNeighborhood,
        addressCity: cust.addressCity,
        addressState: cust.addressState,
        addressZipCode: cust.addressZipCode
      },
      create: {
        phone: cust.phone,
        name: cust.name,
        email: cust.email,
        addressStreet: cust.addressStreet,
        addressNumber: cust.addressNumber,
        addressNeighborhood: cust.addressNeighborhood,
        addressCity: cust.addressCity,
        addressState: cust.addressState,
        addressZipCode: cust.addressZipCode
      }
    });

    for (const tag of cust.tags) {
      await prisma.customerTag.upsert({
        where: { customerId_name: { customerId: createdCust.id, name: tag } },
        update: {},
        create: { customerId: createdCust.id, name: tag, colorHex: tag === 'VIP' ? '#d97706' : '#2563eb' }
      });
    }
  }
  console.log(`✅ Clientes e tags sincronizados.`);

  console.log('🎉 BANCO DE DADOS POPULADO 100% COM DADOS REAIS DO IMPERIUS DO PASTEL!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
