import { json, type RequestHandler } from '@sveltejs/kit';
import { RegisterMovementUseCase, SecurityGuard } from '@cardap/core';
import { PrismaCashShiftRepository } from '@cardap/database';

const cashRepo = new PrismaCashShiftRepository();
const movementUseCase = new RegisterMovementUseCase(cashRepo);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const authCheck = SecurityGuard.authorize(locals.user.role, 'REGISTER_SANGRIA');
  if (authCheck.isFailure) {
    return json({ success: false, error: authCheck.getError().message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { shiftId, amountCents, description } = body;

    if (!shiftId || !amountCents || !description) {
      return json({ success: false, error: 'Preencha shiftId, valor da sangria e justificativa.' }, { status: 400 });
    }

    const cleanDescription = SecurityGuard.sanitizeString(description);
    const validAmount = Math.floor(Number(amountCents));

    const result = await movementUseCase.execute({
      shiftId,
      userId: locals.user.id,
      type: 'SANGRIA',
      amountCents: validAmount,
      description: cleanDescription
    });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      transaction: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao registrar sangria: ${err.message}` }, { status: 500 });
  }
};
