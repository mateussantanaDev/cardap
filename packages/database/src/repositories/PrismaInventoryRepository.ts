import {
  IInventoryRepository,
  IngredientData,
  DeductStockParams,
  InventoryMovementData
} from '@cardap/core';
import { prisma } from '../client.js';
import { randomUUID } from 'node:crypto';

export class PrismaInventoryRepository implements IInventoryRepository {
  async findIngredientById(id: string): Promise<IngredientData | null> {
    const raw = await prisma.ingredient.findUnique({ where: { id } });
    if (!raw) return null;
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      unit: raw.unit as any,
      costPriceCents: Math.round(Number(raw.costPrice) * 100),
      currentStock: Number(raw.currentStock),
      minStock: Number(raw.minStock),
      isActive: raw.isActive
    };
  }

  async findIngredientByCode(code: string): Promise<IngredientData | null> {
    const raw = await prisma.ingredient.findUnique({ where: { code } });
    if (!raw) return null;
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      unit: raw.unit as any,
      costPriceCents: Math.round(Number(raw.costPrice) * 100),
      currentStock: Number(raw.currentStock),
      minStock: Number(raw.minStock),
      isActive: raw.isActive
    };
  }

  async deductStock(params: DeductStockParams): Promise<InventoryMovementData> {
    return await prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: params.ingredientId }
      });

      if (!ingredient) {
        throw new Error(`Insumo com ID '${params.ingredientId}' não foi encontrado para dar baixa.`);
      }

      const updatedStock = Number(ingredient.currentStock) - params.quantity;
      const unitCost = Number(ingredient.costPrice);

      await tx.ingredient.update({
        where: { id: params.ingredientId },
        data: { currentStock: updatedStock }
      });

      const movementId = randomUUID();
      const rawMovement = await tx.inventoryMovement.create({
        data: {
          id: movementId,
          ingredientId: params.ingredientId,
          batchId: params.batchId,
          userId: params.userId,
          orderId: params.orderId,
          type: 'BAIXA_AUTOMATICA',
          quantity: params.quantity,
          unitCost,
          reason: params.reason
        }
      });

      return {
        id: rawMovement.id,
        ingredientId: rawMovement.ingredientId,
        batchId: rawMovement.batchId || undefined,
        userId: rawMovement.userId || undefined,
        orderId: rawMovement.orderId || undefined,
        type: rawMovement.type as any,
        quantity: Number(rawMovement.quantity),
        unitCostCents: Math.round(Number(rawMovement.unitCost) * 100),
        reason: rawMovement.reason || undefined,
        createdAt: rawMovement.createdAt
      };
    });
  }

  async findAllIngredients(): Promise<IngredientData[]> {
    const rawList = await prisma.ingredient.findMany({
      orderBy: { name: 'asc' }
    });

    return rawList.map(raw => ({
      id: raw.id,
      code: raw.code,
      name: raw.name,
      unit: raw.unit as any,
      costPriceCents: Math.round(Number(raw.costPrice) * 100),
      currentStock: Number(raw.currentStock),
      minStock: Number(raw.minStock),
      isActive: raw.isActive
    }));
  }

  async registerStockEntry(params: {
    ingredientId: string;
    quantity: number;
    costPriceCents?: number;
    type: 'ENTRADA_NOTA_FISCAL' | 'PERDA_AVARIA' | 'AJUSTE_MANUAL' | 'DEVOLUCAO';
    reason: string;
    userId?: string;
  }): Promise<InventoryMovementData> {
    return await prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: params.ingredientId }
      });

      if (!ingredient) {
        throw new Error(`Insumo com ID '${params.ingredientId}' não foi encontrado.`);
      }

      const isReduction = params.type === 'PERDA_AVARIA';
      const updatedStock = isReduction
        ? Number(ingredient.currentStock) - params.quantity
        : Number(ingredient.currentStock) + params.quantity;

      const unitCost = params.costPriceCents !== undefined
        ? params.costPriceCents / 100
        : Number(ingredient.costPrice);

      await tx.ingredient.update({
        where: { id: params.ingredientId },
        data: {
          currentStock: updatedStock,
          costPrice: params.costPriceCents !== undefined ? unitCost : ingredient.costPrice
        }
      });

      const movementId = randomUUID();
      const rawMovement = await tx.inventoryMovement.create({
        data: {
          id: movementId,
          ingredientId: params.ingredientId,
          userId: params.userId,
          type: params.type,
          quantity: params.quantity,
          unitCost,
          reason: params.reason
        }
      });

      return {
        id: rawMovement.id,
        ingredientId: rawMovement.ingredientId,
        userId: rawMovement.userId || undefined,
        type: rawMovement.type as any,
        quantity: Number(rawMovement.quantity),
        unitCostCents: Math.round(Number(rawMovement.unitCost) * 100),
        reason: rawMovement.reason || undefined,
        createdAt: rawMovement.createdAt
      };
    });
  }

  async saveMovement(movement: InventoryMovementData): Promise<void> {
    await prisma.inventoryMovement.create({
      data: {
        id: movement.id,
        ingredientId: movement.ingredientId,
        batchId: movement.batchId,
        userId: movement.userId,
        orderId: movement.orderId,
        type: movement.type as any,
        quantity: movement.quantity,
        unitCost: movement.unitCostCents / 100,
        reason: movement.reason,
        createdAt: movement.createdAt
      }
    });
  }

  async checkStockAvailability(ingredientId: string, requiredQuantity: number): Promise<boolean> {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: { currentStock: true }
    });
    if (!ingredient) return false;
    return Number(ingredient.currentStock) >= requiredQuantity;
  }
}
