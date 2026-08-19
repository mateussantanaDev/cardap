import type { PageServerLoad } from './$types';
import { prisma, PrismaInventoryRepository } from '@cardap/database';

const inventoryRepo = new PrismaInventoryRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let inventoryItems: any[] = [];
  let recipes: any[] = [];

  try {
    const rawItems = await inventoryRepo.listAll();
    inventoryItems = rawItems.map((item: any) => ({
      id: item.id,
      code: item.code || `INS-${item.id.slice(0, 4)}`,
      name: item.name,
      category: item.category || 'INSUMO',
      currentQuantity: Number(item.currentStock || item.currentQuantity || 0),
      unit: item.unit || 'KG',
      minQuantity: Number(item.minimumStock || item.minQuantity || 5),
      unitCostCents: Number(item.costPerUnitCents || item.unitCostCents || 1000),
      supplier: item.supplier || 'Fornecedor Principal',
      lastRestockDate: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('pt-BR') : '13/08/2026',
      status: (Number(item.currentStock || 0) <= 2) ? 'CRITICO' : (Number(item.currentStock || 0) <= Number(item.minimumStock || 5)) ? 'BAIXO' : 'NORMAL'
    }));

    const rawRecipes = await prisma.recipeItem.findMany({
      include: {
        product: true,
        ingredient: true
      }
    });

    recipes = rawRecipes.map((r: any) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product?.name || 'Produto',
      ingredientId: r.ingredientId,
      ingredientName: r.ingredient?.name || 'Insumo',
      quantityNeeded: Number(r.quantityNeeded),
      unit: r.ingredient?.unit || 'G'
    }));
  } catch (err) {
    console.warn('Erro ao carregar estoque no SSR:', err);
  }

  return {
    inventoryItems,
    recipes
  };
};
