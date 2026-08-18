import { prisma } from './client.js';
import { PrismaOrderRepository } from './repositories/PrismaOrderRepository.js';
import { PrismaCatalogRepository } from './repositories/PrismaCatalogRepository.js';
import { PrismaTableRepository } from './repositories/PrismaTableRepository.js';
import { PrismaCashShiftRepository } from './repositories/PrismaCashShiftRepository.js';
import { PrismaInventoryRepository } from './repositories/PrismaInventoryRepository.js';
import { PrismaRecipeRepository } from './repositories/PrismaRecipeRepository.js';

export interface DatabaseRepositories {
  orderRepo: PrismaOrderRepository;
  catalogRepo: PrismaCatalogRepository;
  tableRepo: PrismaTableRepository;
  shiftRepo: PrismaCashShiftRepository;
  inventoryRepo: PrismaInventoryRepository;
  recipeRepo: PrismaRecipeRepository;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean | null = null;

  private readonly repos: DatabaseRepositories;

  private constructor() {
    this.repos = {
      orderRepo: new PrismaOrderRepository(),
      catalogRepo: new PrismaCatalogRepository(),
      tableRepo: new PrismaTableRepository(),
      shiftRepo: new PrismaCashShiftRepository(),
      inventoryRepo: new PrismaInventoryRepository(),
      recipeRepo: new PrismaRecipeRepository()
    };
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Verifica se a conexão com o banco de dados PostgreSQL está ativa e operacional.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      this.isConnected = true;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Retorna todas as instâncias de repositórios do Prisma configurados.
   */
  public getRepositories(): DatabaseRepositories {
    return this.repos;
  }

  /**
   * Executa uma transação atômica no banco de dados Prisma.
   */
  public async runTransaction<T>(action: (tx: typeof prisma) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (txClient) => {
      return action(txClient as any);
    });
  }

  /**
   * Desconecta o pool de conexões do Prisma ao encerrar o processo.
   */
  public async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

export const dbService = DatabaseService.getInstance();
