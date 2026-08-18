import { json, type RequestHandler } from '@sveltejs/kit';
import { CloseBlindCashShiftUseCase, CloseBlindCashShiftSchema, SecurityGuard } from '@cardap/core';
import { PrismaCashShiftRepository } from '@cardap/database';

const cashRepo = new PrismaCashShiftRepository();
const closeUseCase = new CloseBlindCashShiftUseCase(cashRepo);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const authCheck = SecurityGuard.authorize(locals.user.role, 'CLOSE_CASH_SHIFT');
  if (authCheck.isFailure) {
    return json({ success: false, error: authCheck.getError().message }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validação estrita via Zod Schema do Fechamento Cego
    const validation = CloseBlindCashShiftSchema.safeParse({
      ...body,
      closedByUserId: locals.user.id
    });

    if (!validation.success) {
      return json({ success: false, error: 'Dados inválidos para fechamento de caixa.' }, { status: 400 });
    }

    const result = await closeUseCase.execute(validation.data);

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      audit: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro no fechamento cego: ${err.message}` }, { status: 500 });
  }
};
