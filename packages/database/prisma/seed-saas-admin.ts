if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cardap_admin:cardap_secret_password_2026@localhost:5432/cardap_db?schema=public';
}

import { PrismaClient } from '@prisma/client';
import { UserEntity } from '@cardap/core';
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
  const models = [
    'orderItemComplement',
    'orderItemAssembly',
    'orderItemModifier',
    'orderItem',
    'orderStatusHistory',
    'payment',
    'order',
    'cashTransaction',
    'cashShift',
    'inventoryMovement',
    'inventoryBatch',
    'productRecipe',
    'productModifierOption',
    'productModifierGroup',
    'assemblyOption',
    'assemblyGroup',
    'complementOption',
    'complementGroup',
    'product',
    'category',
    'ingredient',
    'customerMessage',
    'customerTag',
    'customer',
    'table',
    'coupon',
    'deliveryDriver',
    'deliveryZone',
    'userSession',
    'user',
    'restaurant'
  ];

  for (const model of models) {
    if ((prisma as any)[model] && typeof (prisma as any)[model].deleteMany === 'function') {
      try {
        await (prisma as any)[model].deleteMany({});
        console.log(`  ✓ Tabela ${model} limpa.`);
      } catch (e: any) {
        console.warn(`  ⚠️ Aviso ao limpar ${model}:`, e.message);
      }
    }
  }

  console.log('✅ Todas as tabelas transacionais foram limpas com sucesso.');

  // 3. Criar ou Atualizar o Usuário Superadmin do SaaS
  const passwordHash = UserEntity.hashPassword('admin123');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@cardap.app' },
    update: {
      name: 'Superadmin do SaaS (Gestor Master)',
      phone: '(11) 99999-9999',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      restaurantId: null
    },
    create: {
      name: 'Superadmin do SaaS (Gestor Master)',
      email: 'admin@cardap.app',
      phone: '(11) 99999-9999',
      passwordHash,
      role: 'ADMIN',
      isActive: true
    }
  });

  console.log(`\n👑 USUÁRIO SUPERADMIN DO SAAS PRONTO:`);
  console.log(`   ID: ${superAdmin.id}`);
  console.log(`   Nome: ${superAdmin.name}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Senha: admin123`);
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
