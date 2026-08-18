import { describe, it, expect } from 'vitest';
import { RegisterInventoryMovementUseCase } from '../src/use-cases/inventory/RegisterInventoryMovementUseCase';
import { GetInventoryStatusUseCase } from '../src/use-cases/inventory/GetInventoryStatusUseCase';
import { DeductInventoryForOrderUseCase } from '../src/use-cases/inventory/DeductInventoryForOrderUseCase';
import { IInventoryRepository, IngredientData, DeductStockParams, InventoryMovementData } from '../src/domain/repositories/IInventoryRepository';
import { IOrderRepository, OrderFilterParams } from '../src/domain/repositories/IOrderRepository';
import { IRecipeRepository, RecipeItemData, OptionIngredientData } from '../src/domain/repositories/IRecipeRepository';
import { OrderEntity, OrderItem } from '../src/domain/entities/Order';
import { Money } from '../src/domain/value-objects/Money';

class InMemoryInventoryRepository implements IInventoryRepository {
  private ingredients: IngredientData[] = [
    { id: 'ing-1', code: 'INS-01', name: 'Massa Especial Giga', unit: 'UN', costPriceCents: 250, currentStock: 50, minStock: 10, isActive: true },
    { id: 'ing-2', code: 'INS-02', name: 'Carne Moída Prime', unit: 'KG', costPriceCents: 3200, currentStock: 5.0, minStock: 2.0, isActive: true }
  ];

  async findIngredientById(id: string): Promise<IngredientData | null> {
    return this.ingredients.find(i => i.id === id) || null;
  }

  async findIngredientByCode(code: string): Promise<IngredientData | null> {
    return this.ingredients.find(i => i.code === code) || null;
  }

  async findAllIngredients(): Promise<IngredientData[]> {
    return this.ingredients;
  }

  async deductStock(params: DeductStockParams): Promise<InventoryMovementData> {
    const ing = this.ingredients.find(i => i.id === params.ingredientId);
    if (!ing) throw new Error("Insumo não encontrado");
    ing.currentStock -= params.quantity;
    return {
      id: 'mov-1',
      ingredientId: ing.id,
      type: 'BAIXA_AUTOMATICA',
      quantity: params.quantity,
      unitCostCents: ing.costPriceCents,
      createdAt: new Date()
    };
  }

  async registerStockEntry(params: { ingredientId: string; quantity: number; costPriceCents?: number; type: any; reason: string; userId?: string }): Promise<InventoryMovementData> {
    const ing = this.ingredients.find(i => i.id === params.ingredientId);
    if (!ing) throw new Error("Insumo não encontrado");
    if (params.type === 'PERDA_AVARIA') ing.currentStock -= params.quantity;
    else ing.currentStock += params.quantity;

    return {
      id: 'mov-2',
      ingredientId: ing.id,
      type: params.type,
      quantity: params.quantity,
      unitCostCents: params.costPriceCents || ing.costPriceCents,
      reason: params.reason,
      createdAt: new Date()
    };
  }

  async saveMovement(): Promise<void> {}
  async checkStockAvailability(ingredientId: string, requiredQuantity: number): Promise<boolean> {
    const ing = this.ingredients.find(i => i.id === ingredientId);
    return Boolean(ing && ing.currentStock >= requiredQuantity);
  }
}

class MockOrderRepo implements IOrderRepository {
  private order: OrderEntity;
  constructor(order: OrderEntity) { this.order = order; }
  async findById(): Promise<OrderEntity | null> { return this.order; }
  async findByOrderNumber(): Promise<OrderEntity | null> { return this.order; }
  async findActiveByTableId(): Promise<OrderEntity[]> { return []; }
  async findKdsActiveOrders(): Promise<OrderEntity[]> { return []; }
  async findMany(): Promise<OrderEntity[]> { return []; }
  async save(): Promise<void> {}
  async getNextDailyOrderNumber(): Promise<number> { return 101; }
}

class MockRecipeRepo implements IRecipeRepository {
  async getRecipeByProductId(productId: string): Promise<RecipeItemData[]> {
    return [
      { id: 'rec-1', productId, ingredientId: 'ing-1', quantityNeeded: 1 },
      { id: 'rec-2', productId, ingredientId: 'ing-2', quantityNeeded: 0.150 } // 150g de carne por pastel
    ];
  }
  async getAssemblyOptionIngredient(): Promise<OptionIngredientData | null> { return null; }
  async getComplementOptionIngredient(): Promise<OptionIngredientData | null> { return null; }
}

describe('Etapa 4: Backend de Estoque, Ficha Técnica e Alertas Mínimos', () => {
  it('deve dar entrada de nota fiscal de insumos e atualizar o saldo em estoque', async () => {
    const repo = new InMemoryInventoryRepository();
    const useCase = new RegisterInventoryMovementUseCase(repo);

    const result = await useCase.execute({
      ingredientId: 'ing-1',
      quantity: 100, // +100 massas
      type: 'ENTRADA_NOTA_FISCAL',
      reason: 'Entrada NF #5052 - Fornecedor de Massas'
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().newCurrentStock).toBe(150); // 50 inicial + 100 = 150
  });

  it('deve listar insumos e sinalizar alerta para aqueles com estoque abaixo do mínimo', async () => {
    const repo = new InMemoryInventoryRepository();
    const statusUseCase = new GetInventoryStatusUseCase(repo);

    const list = await statusUseCase.execute();
    expect(list.length).toBe(2);

    const massas = list.find(i => i.id === 'ing-1');
    expect(massas?.isBelowMinimum).toBe(false); // 50 > 10 (Ok)
  });

  it('deve dar baixa automática de insumos por ficha técnica ao processar um pedido', async () => {
    const ingRepo = new InMemoryInventoryRepository();
    const sampleOrder = new OrderEntity({
      id: 'ord-88',
      orderNumber: 188,
      type: 'BALCAO',
      paymentMethod: 'PIX',
      shiftId: 'shift-1',
      items: [
        new OrderItem({
          id: 'item-10',
          productId: 'prod-pastel-carne',
          productName: 'Pastel Especial de Carne',
          quantity: 2,
          unitPrice: Money.fromCents(2000)
        })
      ]
    });

    const orderRepo = new MockOrderRepo(sampleOrder);
    const recipeRepo = new MockRecipeRepo();

    const deductUseCase = new DeductInventoryForOrderUseCase(orderRepo, ingRepo, recipeRepo);
    const result = await deductUseCase.execute({ orderId: 'ord-88' });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().totalMovements).toBe(2);

    // Saldo da carne moída deve ter caído 300g (2x 150g = 300g = 0.300kg) => 5.0 - 0.3 = 4.7 kg
    const carne = await ingRepo.findIngredientById('ing-2');
    expect(carne?.currentStock).toBe(4.7);
  });
});
