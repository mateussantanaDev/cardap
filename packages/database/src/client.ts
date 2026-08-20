if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cardap_admin:cardap_secret_password_2026@184.107.179.209:15432/cardap_db?schema=public';
}

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

/**
 * Instância Singleton do PrismaClient para otimização de pool de conexões PostgreSQL.
 */
export const prisma =
  globalThis.globalPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalPrisma = prisma;
}
