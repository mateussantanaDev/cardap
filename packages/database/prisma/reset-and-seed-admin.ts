if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cardap_admin:cardap_secret_password_2026@localhost:5432/cardap_db?schema=public';
}

import { PrismaClient } from '@prisma/client';
import { UserEntity } from '@cardap/core';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 1. Zerando completamente todas as tabelas do banco de dados...');

  // Deleta todas as tabelas na ordem correta respeitando foreign keys
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

  console.log('✅ Banco de dados 100% limpo!');

  console.log('🌱 2. Injetando EXCLUSIVAMENTE o Usuário Administrador do SaaS...');

  const rawPassword = 'Aguasbelas#1';
  const passwordHash = UserEntity.hashPassword(rawPassword);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Mateus Vieira',
      email: 'mateushenrivieira@gmail.com',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      restaurantId: null
    }
  });

  console.log('====================================================');
  console.log('   🎉 BANCO DE DADOS LIMPO & ADMIN SaaS CRIADO!     ');
  console.log('====================================================');
  console.log(`👤 Nome  : ${adminUser.name}`);
  console.log(`📧 E-mail: ${adminUser.email}`);
  console.log(`🔑 Senha : ${rawPassword}`);
  console.log(`🛡️ Cargo : ${adminUser.role} (Superadmin do SaaS)`);
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
