export interface RecipeItemData {
  id: string;
  productId: string;
  ingredientId: string;
  ingredientName: string;
  quantityNeeded: number; // quantidade em frações (ex: 0.120 para 120g de carne moída)
}

export interface OptionIngredientData {
  optionId: string;
  ingredientId?: string;
  ingredientName?: string;
  quantityNeeded: number;
}

export interface IRecipeRepository {
  getRecipeByProductId(productId: string): Promise<RecipeItemData[]>;
  getAssemblyOptionIngredient(assemblyOptionId: string): Promise<OptionIngredientData | null>;
  getModifierOptionIngredient(modifierOptionId: string): Promise<OptionIngredientData | null>;
  getComplementOptionIngredient(complementOptionId: string): Promise<OptionIngredientData | null>;
}
