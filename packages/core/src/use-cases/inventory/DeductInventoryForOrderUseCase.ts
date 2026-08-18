import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { Result } from '../../shared/Result';
import { DomainError, InvalidOrderStateError } from '../../shared/DomainError';

export interface DeductInventoryForOrderInputDTO {
  orderId: string;
  executedByUserId?: string;
  allowNegativeStock?: boolean;
}

export interface DeductedIngredientSummary {
  ingredientId: string;
  ingredientName: string;
  quantityDeducted: number;
  unit: string;
  remainingStock: number;
}

export interface DeductInventoryForOrderOutputDTO {
  orderId: string;
  orderNumber: number;
  totalMovements: number;
  deductions: DeductedIngredientSummary[];
}

/**
 * Caso de Uso: Engenharia de Cardápio / Baixa de Estoque por Ficha Técnica (BOM)
 * Executado quando um pedido atinge status RECEBIDO ou PAGO.
 * Baixa frações exatas de insumos (massa giga, gramas de recheio, embalagem) vinculados a produtos e montagens.
 */
export class DeductInventoryForOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private inventoryRepo: IInventoryRepository,
    private recipeRepo: IRecipeRepository
  ) {}

  async execute(
    request: DeductInventoryForOrderInputDTO
  ): Promise<Result<DeductInventoryForOrderOutputDTO, DomainError>> {
    // 1. Buscar o pedido no repositório
    const order = await this.orderRepo.findById(request.orderId);
    if (!order) {
      return Result.fail(new InvalidOrderStateError(`Pedido com ID '${request.orderId}' não foi encontrado.`));
    }

    const deductionsSummary: DeductedIngredientSummary[] = [];
    let totalMovements = 0;

    // 2. Iterar sobre os itens do pedido
    for (const item of order.items) {
      // 2.1. Ficha Técnica Direta do Produto
      const recipeItems = await this.recipeRepo.getRecipeByProductId(item.productId);

      for (const recipeItem of recipeItems) {
        const totalFractionDeducted = recipeItem.quantityNeeded * item.quantity;

        // Verificar o insumo no repositório de estoque
        const ingredient = await this.inventoryRepo.findIngredientById(recipeItem.ingredientId);
        if (!ingredient) continue;

        // Trava de estoque negativo (se habilitada)
        if (!request.allowNegativeStock && ingredient.currentStock < totalFractionDeducted) {
          return Result.fail(
            new InvalidOrderStateError(
              `Estoque insuficiente do insumo '${ingredient.name}'. Requerido: ${totalFractionDeducted}${ingredient.unit}, Atual: ${ingredient.currentStock}${ingredient.unit}.`
            )
          );
        }

        // Executar a baixa fracionada no estoque
        const movement = await this.inventoryRepo.deductStock({
          ingredientId: ingredient.id,
          quantity: totalFractionDeducted,
          reason: `Baixa Automática Ficha Técnica - Pedido #${order.orderNumber}`,
          orderId: order.id,
          userId: request.executedByUserId
        });

        totalMovements++;
        deductionsSummary.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          quantityDeducted: totalFractionDeducted,
          unit: ingredient.unit,
          remainingStock: ingredient.currentStock - totalFractionDeducted
        });
      }

      // 2.2. Baixa de Insumos vinculados às Opções do Motor de Montagem ("Monte seu Pastel")
      for (const assemblyChoice of item.assemblies) {
        const optionIng = await this.recipeRepo.getAssemblyOptionIngredient(assemblyChoice.id);
        if (optionIng && optionIng.ingredientId) {
          const totalFraction = optionIng.quantityNeeded * assemblyChoice.quantity * item.quantity;
          const ingredient = await this.inventoryRepo.findIngredientById(optionIng.ingredientId);
          if (ingredient) {
            await this.inventoryRepo.deductStock({
              ingredientId: ingredient.id,
              quantity: totalFraction,
              reason: `Baixa Automática Montagem (${assemblyChoice.name}) - Pedido #${order.orderNumber}`,
              orderId: order.id,
              userId: request.executedByUserId
            });

            totalMovements++;
            deductionsSummary.push({
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              quantityDeducted: totalFraction,
              unit: ingredient.unit,
              remainingStock: ingredient.currentStock - totalFraction
            });
          }
        }
      }

      // 2.3. Baixa de Insumos de Complementos Avulsos (ex: Bebidas, Molhos)
      for (const complementChoice of item.complements) {
        const cmpIng = await this.recipeRepo.getComplementOptionIngredient(complementChoice.id);
        if (cmpIng && cmpIng.ingredientId) {
          const totalFraction = cmpIng.quantityNeeded * complementChoice.quantity * item.quantity;
          const ingredient = await this.inventoryRepo.findIngredientById(cmpIng.ingredientId);
          if (ingredient) {
            await this.inventoryRepo.deductStock({
              ingredientId: ingredient.id,
              quantity: totalFraction,
              reason: `Baixa Automática Complemento (${complementChoice.name}) - Pedido #${order.orderNumber}`,
              orderId: order.id,
              userId: request.executedByUserId
            });

            totalMovements++;
            deductionsSummary.push({
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              quantityDeducted: totalFraction,
              unit: ingredient.unit,
              remainingStock: ingredient.currentStock - totalFraction
            });
          }
        }
      }
    }

    return Result.ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalMovements,
      deductions: deductionsSummary
    });
  }
}
