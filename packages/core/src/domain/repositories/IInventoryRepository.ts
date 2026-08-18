export interface IngredientData {
  id: string;
  code: string;
  name: string;
  unit: 'KG' | 'G' | 'L' | 'ML' | 'UN';
  costPriceCents: number;
  currentStock: number;
  minStock: number;
  isActive: boolean;
}

export interface DeductStockParams {
  ingredientId: string;
  quantity: number; // quantidade em frações (ex: 0.120 kg de carne, 1 unidade de embalagem)
  reason: string;
  orderId?: string;
  batchId?: string;
  userId?: string;
}

export interface InventoryMovementData {
  id: string;
  ingredientId: string;
  batchId?: string;
  userId?: string;
  orderId?: string;
  type: 'BAIXA_AUTOMATICA' | 'ENTRADA_NOTA_FISCAL' | 'PERDA_AVARIA' | 'AJUSTE_MANUAL' | 'DEVOLUCAO';
  quantity: number;
  unitCostCents: number;
  reason?: string;
  createdAt: Date;
}

export interface IInventoryRepository {
  findIngredientById(id: string): Promise<IngredientData | null>;
  findIngredientByCode(code: string): Promise<IngredientData | null>;
  findAllIngredients(): Promise<IngredientData[]>;
  deductStock(params: DeductStockParams): Promise<InventoryMovementData>;
  registerStockEntry(params: {
    ingredientId: string;
    quantity: number;
    costPriceCents?: number;
    type: 'ENTRADA_NOTA_FISCAL' | 'PERDA_AVARIA' | 'AJUSTE_MANUAL' | 'DEVOLUCAO';
    reason: string;
    userId?: string;
  }): Promise<InventoryMovementData>;
  saveMovement(movement: InventoryMovementData): Promise<void>;
  checkStockAvailability(ingredientId: string, requiredQuantity: number): Promise<boolean>;
}
