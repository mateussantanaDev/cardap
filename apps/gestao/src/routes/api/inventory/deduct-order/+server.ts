import { json, type RequestHandler } from '@sveltejs/kit';
import { DeductInventoryForOrderUseCase } from '@cardap/core';
import { PrismaOrderRepository, PrismaInventoryRepository, PrismaRecipeRepository } from '@cardap/database';

const orderRepo = new PrismaOrderRepository();
const inventoryRepo = new PrismaInventoryRepository();
const recipeRepo = new PrismaRecipeRepository();
const deductUseCase = new DeductInventoryForOrderUseCase(orderRepo, inventoryRepo, recipeRepo);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, allowNegativeStock } = body;

    if (!orderId) {
      return json({ success: false, error: 'Informe o orderId do pedido.' }, { status: 400 });
    }

    const result = await deductUseCase.execute({
      orderId,
      executedByUserId: locals.user.id,
      allowNegativeStock: allowNegativeStock ?? false
    });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      deductionSummary: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro na baixa automática por ficha técnica: ${err.message}` }, { status: 500 });
  }
};
