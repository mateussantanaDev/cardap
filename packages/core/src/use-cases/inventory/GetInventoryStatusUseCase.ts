import { IInventoryRepository, IngredientData } from '../../domain/repositories/IInventoryRepository';

export interface IngredientStatusOutputDTO {
  id: string;
  code: string;
  name: string;
  unit: string;
  costPriceCents: number;
  costPriceFormatted: string;
  currentStock: number;
  minStock: number;
  isBelowMinimum: boolean;
  isActive: boolean;
}

export class GetInventoryStatusUseCase {
  constructor(private inventoryRepo: IInventoryRepository) {}

  async execute(): Promise<IngredientStatusOutputDTO[]> {
    const ingredients = await this.inventoryRepo.findAllIngredients();

    return ingredients.map(ing => {
      const isBelowMinimum = ing.currentStock <= ing.minStock;
      const costPriceFormatted = (ing.costPriceCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });

      return {
        id: ing.id,
        code: ing.code,
        name: ing.name,
        unit: ing.unit,
        costPriceCents: ing.costPriceCents,
        costPriceFormatted,
        currentStock: ing.currentStock,
        minStock: ing.minStock,
        isBelowMinimum,
        isActive: ing.isActive
      };
    });
  }
}
