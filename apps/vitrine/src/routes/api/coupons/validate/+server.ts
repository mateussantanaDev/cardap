import { json, type RequestHandler } from '@sveltejs/kit';
import { ValidateCouponUseCase } from '@cardap/core';
import { PrismaCouponRepository } from '@cardap/database';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { code } = body;
    const subtotalCents = body.subtotalCents && Number(body.subtotalCents) > 0 ? Number(body.subtotalCents) : 5000;

    if (!code || typeof code !== 'string') {
      return json({ success: false, error: 'Código de cupom é obrigatório.' }, { status: 400 });
    }

    const couponRepo = new PrismaCouponRepository();
    const useCase = new ValidateCouponUseCase(couponRepo);
    const result = await useCase.execute({ code: code.trim().toUpperCase(), subtotalCents });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    const data = result.getValue();
    return json({
      success: true,
      data
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao validar cupom: ${err.message}` }, { status: 500 });
  }
};
