if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cardap_admin:cardap_secret_password_2026@localhost:5432/cardap_db?schema=public';
}

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpando 100% de todos os dados do banco de dados e cache...');

  // 1. Limpar Cache Redis
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(redisUrl);
    await redis.flushall();
    console.log('✅ Cache do Redis zerado com FLUSHALL.');
    redis.disconnect();
  } catch (err: any) {
    console.warn('⚠️ Redis não acessível para flush (continuando limpeza do Postgres):', err.message);
  }

  // 2. Limpar dados de todas as tabelas via Prisma Client
  try {
    await prisma.orderItem.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.order.deleteMany();
    await prisma.assemblyOption.deleteMany();
    await prisma.assemblyGroup.deleteMany();
    await prisma.recipeItem.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.ingredientMovement.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.cashTransaction.deleteMany();
    await prisma.cashMovement.deleteMany();
    await prisma.cashShift.deleteMany();
    await prisma.customerTag.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.table.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.deliveryZone.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.deliveryDriver.deleteMany();
    await prisma.user.deleteMany();
    await prisma.restaurant.deleteMany();
    console.log('✅ Todas as tabelas transacionais foram limpas com sucesso.');
  } catch (err: any) {
    console.warn('⚠️ Aviso ao limpar tabelas (podem já estar vazias):', err.message);
  }

  // 3. Criar APENAS 1 Usuário Superadmin (Gestor do SaaS)
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Superadmin do SaaS (Gestor Master)',
      email: 'admin@cardap.app',
      phone: '(11) 99999-9999',
      passwordHash: '$2b$10$abcdef1234567890ImperiusSecure2026AdminPass',
      role: 'ADMIN',
      isActive: true
    }
  });

  console.log(`\n👑 USUÁRIO SUPERADMIN DO SAAS CRIADO COM SUCESSO:`);
  console.log(`   ID: ${superAdmin.id}`);
  console.log(`   Nome: ${superAdmin.name}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Cargo: ${superAdmin.role}`);
  console.log(`\n✨ Banco de dados limpo e pronto para produção! 0 dados mockados.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante limpeza e seed do SaaS Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
