import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { Result } from '../../shared/Result';
import { DomainError, InvalidAmountError } from '../../shared/DomainError';

export interface RegisterInventoryMovementInputDTO {
  ingredientId: string;
  quantity: number;
  costPriceCents?: number;
  type: 'ENTRADA_NOTA_FISCAL' | 'PERDA_AVARIA' | 'AJUSTE_MANUAL' | 'DEVOLUCAO';
  reason: string;
  userId?: string;
}

export interface RegisterInventoryMovementOutputDTO {
  movementId: string;
  ingredientId: string;
  ingredientName: string;
  type: string;
  quantity: number;
  unit: string;
  newCurrentStock: number;
  createdAt: Date;
}

export class RegisterInventoryMovementUseCase {
  constructor(private inventoryRepo: IInventoryRepository) {}

  async execute(request: RegisterInventoryMovementInputDTO): Promise<Result<RegisterInventoryMovementOutputDTO, DomainError>> {
    if (request.quantity <= 0) {
      return Result.fail(new InvalidAmountError("A quantidade da movimentação deve ser maior que zero."));
    }
    if (!request.reason || request.reason.trim().length === 0) {
      return Result.fail(new InvalidAmountError("Forneça a justificativa/motivo da movimentação de estoque."));
    }

    const ingredient = await this.inventoryRepo.findIngredientById(request.ingredientId);
    if (!ingredient) {
      return Result.fail(new InvalidAmountError(`Insumo com ID '${request.ingredientId}' não encontrado.`));
    }

    const movement = await this.inventoryRepo.registerStockEntry({
      ingredientId: request.ingredientId,
      quantity: request.quantity,
      costPriceCents: request.costPriceCents,
      type: request.type,
      reason: request.reason,
      userId: request.userId
    });

    const updatedIngredient = await this.inventoryRepo.findIngredientById(request.ingredientId);

    return Result.ok({
      movementId: movement.id,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      type: movement.type,
      quantity: movement.quantity,
      unit: ingredient.unit,
      newCurrentStock: updatedIngredient?.currentStock || ingredient.currentStock,
      createdAt: movement.createdAt
    });
  }
}
