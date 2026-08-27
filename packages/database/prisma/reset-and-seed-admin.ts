if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cardap_admin:cardap_secret_password_2026@localhost:5432/cardap_db?schema=public';
}

import { PrismaClient } from '@prisma/client';
import { UserEntity } from '@cardap/core';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 1. Zerando completamente todas as tabelas do banco de dados...');

  // Deleta todas as tabelas na ordem de dependência relacional
  await prisma.$transaction([
    prisma.customerMessage.deleteMany(),
    prisma.customerTag.deleteMany(),
    prisma.orderItemModifier.deleteMany(),
    prisma.orderItemAssembly.deleteMany(),
    prisma.orderItemComplement.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.orderStatusHistory.deleteMany(),
    prisma.cashTransaction.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cashShift.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.printerDevice.deleteMany(),
    prisma.deliveryDriver.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.table.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.productRecipe.deleteMany(),
    prisma.inventoryBatch.deleteMany(),
    prisma.ingredient.deleteMany(),
    prisma.productModifierOption.deleteMany(),
    prisma.productModifierGroup.deleteMany(),
    prisma.assemblyOption.deleteMany(),
    prisma.assemblyGroup.deleteMany(),
    prisma.complementOption.deleteMany(),
    prisma.complementGroup.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.deliveryZone.deleteMany(),
    prisma.user.deleteMany(),
    prisma.restaurant.deleteMany()
  ]);

  console.log('✅ Banco de dados limpo com sucesso!');

  console.log('🌱 2. Criando Estabelecimento e Usuário Desenvolvedor/Admin...');

  // 1. Criar Restaurante Padrão
  const restaurant = await prisma.restaurant.create({
    data: {
      slug: 'imperius-do-pastel',
      name: 'Imperius do Pastel',
      category: 'Restaurante & Lanchonete',
      phone: '(87) 99812-3456',
      email: 'mateushenrivieira@gmail.com',
      cnpj: '52.894.103/0001-88',
      addressStreet: 'Av. Rui Barbosa',
      addressNumber: '450',
      addressNeighborhood: 'Centro',
      addressCity: 'Garanhuns',
      addressState: 'PE',
      addressZipCode: '55295-000',
      minOrderValue: 0.00,
      deliveryFee: 5.00,
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

  // 2. Hash da Senha Segura
  const rawPassword = 'Aguasbelas#1';
  const passwordHash = UserEntity.hashPassword(rawPassword);

  // 3. Criar Único Usuário Desenvolvedor / Admin
  const adminUser = await prisma.user.create({
    data: {
      name: 'Mateus Vieira',
      email: 'mateushenrivieira@gmail.com',
      phone: '(87) 99812-3456',
      passwordHash,
      role: 'ADMIN',
      restaurantId: restaurant.id,
      isActive: true
    }
  });

  // 4. Criar Mesas Iniciais do Salão (1 a 10)
  for (let i = 1; i <= 10; i++) {
    await prisma.table.create({
      data: {
        number: i,
        capacity: 4,
        status: 'LIVRE',
        qrTokenSignature: `table_sig_mesa_${i}_${Date.now()}`
      }
    });
  }

  // 5. Criar Categorias Base
  const catLanches = await prisma.category.create({
    data: {
      name: 'Lanches & Pastéis',
      slug: 'lanches-pasteis',
      sortOrder: 1,
      isActive: true
    }
  });

  const catBebidas = await prisma.category.create({
    data: {
      name: 'Bebidas & Sucos',
      slug: 'bebidas-sucos',
      sortOrder: 2,
      isActive: true
    }
  });

  console.log('====================================================');
  console.log('   🎉 BANCO DE DADOS REINICIALIZADO COM SUCESSO!   ');
  console.log('====================================================');
  console.log(`👤 Usuário Admin: ${adminUser.name}`);
  console.log(`📧 E-mail       : ${adminUser.email}`);
  console.log(`🔑 Senha        : ${rawPassword}`);
  console.log(`🏢 Estabelec.   : ${restaurant.name} (${restaurant.slug})`);
  console.log(`🛡️ Cargo        : ${adminUser.role}`);
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao reinicializar o banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
