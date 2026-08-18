import {
  IRecipeRepository,
  RecipeItemData,
  OptionIngredientData
} from '@cardap/core';
import { prisma } from '../client.js';

export class PrismaRecipeRepository implements IRecipeRepository {
  async getRecipeByProductId(productId: string): Promise<RecipeItemData[]> {
    const rawRecipes = await prisma.productRecipe.findMany({
      where: { productId },
      include: { ingredient: { select: { name: true } } }
    });

    return rawRecipes.map(r => ({
      id: r.id,
      productId: r.productId,
      ingredientId: r.ingredientId,
      ingredientName: r.ingredient.name,
      quantityNeeded: Number(r.quantityNeeded)
    }));
  }

  async getAssemblyOptionIngredient(assemblyOptionId: string): Promise<OptionIngredientData | null> {
    const option = await prisma.assemblyOption.findUnique({
      where: { id: assemblyOptionId },
      include: { ingredient: { select: { name: true } } }
    });

    if (!option || !option.ingredientId) return null;

    return {
      optionId: option.id,
      ingredientId: option.ingredientId,
      ingredientName: option.ingredient?.name,
      quantityNeeded: 1.0 // fração padrão da opção de montagem
    };
  }

  async getModifierOptionIngredient(modifierOptionId: string): Promise<OptionIngredientData | null> {
    const option = await prisma.productModifierOption.findUnique({
      where: { id: modifierOptionId },
      include: { ingredient: { select: { name: true } } }
    });

    if (!option || !option.ingredientId) return null;

    return {
      optionId: option.id,
      ingredientId: option.ingredientId,
      ingredientName: option.ingredient?.name,
      quantityNeeded: 1.0
    };
  }

  async getComplementOptionIngredient(complementOptionId: string): Promise<OptionIngredientData | null> {
    const option = await prisma.complementOption.findUnique({
      where: { id: complementOptionId },
      include: { ingredient: { select: { name: true } } }
    });

    if (!option || !option.ingredientId) return null;

    return {
      optionId: option.id,
      ingredientId: option.ingredientId,
      ingredientName: option.ingredient?.name,
      quantityNeeded: 1.0
    };
  }
}
