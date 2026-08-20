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

  // 2. Limpar Tabelas do PostgreSQL em ordem correta de Foreign Keys
  const tablenames = [
    'OrderItem',
    'OrderHistory',
    'Order',
    'AssemblyOption',
    'AssemblyGroup',
    'Product',
    'Category',
    'RecipeItem',
    'Recipe',
    'IngredientMovement',
    'Ingredient',
    'CashTransaction',
    'CashMovement',
    'CashShift',
    'CustomerTag',
    'Customer',
    'Table',
    'Coupon',
    'DeliveryZone',
    'UserSession',
    'User',
    'Restaurant'
  ];

  for (const table of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`  ✓ Tabela ${table} limpa`);
    } catch (e: any) {
      console.log(`  - Tabela ${table} (vazia ou ignorada): ${e.message}`);
    }
  }

  console.log('✅ Todas as tabelas transacionais foram zeradas.');

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
