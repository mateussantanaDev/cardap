import { json, type RequestHandler } from '@sveltejs/kit';
import { OpenCashShiftUseCase, SecurityGuard } from '@cardap/core';
import { PrismaCashShiftRepository } from '@cardap/database';

const cashRepo = new PrismaCashShiftRepository();
const openUseCase = new OpenCashShiftUseCase(cashRepo);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const authCheck = SecurityGuard.authorize(locals.user.role, 'OPEN_CASH_SHIFT');
  if (authCheck.isFailure) {
    return json({ success: false, error: authCheck.getError().message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const initialCents = Math.floor(Number(body.initialCents) || 0);
    const notes = body.notes ? SecurityGuard.sanitizeString(body.notes) : undefined;

    const result = await openUseCase.execute({
      openedByUserId: locals.user.id,
      initialCents,
      notes
    });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      shift: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro no servidor: ${err.message}` }, { status: 500 });
  }
};
