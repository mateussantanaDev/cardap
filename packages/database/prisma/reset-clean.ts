if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cardap_admin:cardap_secret_password_2026@localhost:5432/cardap_db?schema=public';
}

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

async function reset() {
  console.log('🧹 [1/3] Limpando todas as tabelas do PostgreSQL...');

  // Deletar tabelas transacionais e filhas primeiro para respeitar foreign keys
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItemAssembly.deleteMany();
  await prisma.orderItemComplement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();

  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryBatch.deleteMany();

  await prisma.cashTransaction.deleteMany();
  await prisma.cashShift.deleteMany();

  await prisma.userSession.deleteMany();
  await prisma.customerMessage.deleteMany();
  await prisma.customerTag.deleteMany();
  await prisma.customer.deleteMany();

  await prisma.coupon.deleteMany();
  await prisma.deliveryZone.deleteMany();

  await prisma.assemblyOption.deleteMany();
  await prisma.assemblyGroup.deleteMany();
  await prisma.productModifierOption.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.complementOption.deleteMany();
  await prisma.complementGroup.deleteMany();
  await prisma.productRecipe.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  console.log('✅ PostgreSQL 100% limpo e zerado.');

  console.log('🧹 [2/3] Limpando cache e filas do Redis...');
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(redisUrl, { lazyConnect: true });
    await redis.connect();
    await redis.flushall();
    await redis.quit();
    console.log('✅ Redis FLUSHALL executado com sucesso.');
  } catch (err: any) {
    console.warn('⚠️ Aviso ao limpar Redis (pode ser ignorado se offline):', err.message);
  }

  console.log('🌱 [3/3] Executando Seed de Produção com Dados Reais e Estrutura Limpa...');
}

reset()
  .catch((e) => {
    console.error('❌ Erro ao zerar banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
