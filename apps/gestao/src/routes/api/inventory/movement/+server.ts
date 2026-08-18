import { json, type RequestHandler } from '@sveltejs/kit';
import { RegisterInventoryMovementUseCase, SecurityGuard } from '@cardap/core';
import { PrismaInventoryRepository } from '@cardap/database';

const inventoryRepo = new PrismaInventoryRepository();
const movementUseCase = new RegisterInventoryMovementUseCase(inventoryRepo);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const authCheck = SecurityGuard.authorize(locals.user.role, 'MANAGE_INVENTORY');
  if (authCheck.isFailure) {
    return json({ success: false, error: authCheck.getError().message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ingredientId, quantity, type, reason, costPriceCents } = body;

    if (!ingredientId || !quantity || !type || !reason) {
      return json({ success: false, error: 'Preencha ingrediente, quantidade, tipo e justificativa.' }, { status: 400 });
    }

    const cleanReason = SecurityGuard.sanitizeString(reason);
    const validQty = Number(quantity);

    const result = await movementUseCase.execute({
      ingredientId,
      quantity: validQty,
      costPriceCents: costPriceCents ? Math.floor(Number(costPriceCents)) : undefined,
      type,
      reason: cleanReason,
      userId: locals.user.id
    });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      movement: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao registrar movimentação de estoque: ${err.message}` }, { status: 500 });
  }
};
