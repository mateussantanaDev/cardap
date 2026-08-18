import { json, type RequestHandler } from '@sveltejs/kit';
import { ValidateCouponUseCase } from '@cardap/core';
import { PrismaCouponRepository } from '@cardap/database';

// Cupons em memória para fallback se banco não estiver conectado
const MOCK_COUPONS: Record<string, any> = {
  CARDAP10: {
    id: 'c-10',
    code: 'CARDAP10',
    discountType: 'PERCENTUAL',
    discountValue: 10,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    currentUsages: 5,
    isActive: true
  },
  FRETEGRATIS: {
    id: 'c-frete',
    code: 'FRETEGRATIS',
    discountType: 'VALOR_FIXO',
    discountValue: 8.50,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    currentUsages: 12,
    isActive: true
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { code, subtotalCents } = body;

    if (!code || typeof code !== 'string') {
      return json({ success: false, error: 'Código de cupom é obrigatório.' }, { status: 400 });
    }

    if (!subtotalCents || subtotalCents <= 0) {
      return json({ success: false, error: 'Subtotal do pedido inválido.' }, { status: 400 });
    }

    let couponRepo;
    try {
      couponRepo = new PrismaCouponRepository();
    } catch {
      // Fallback em memória para dev
      couponRepo = {
        findByCode: async (c: string) => MOCK_COUPONS[c.toUpperCase()] || null,
        incrementUsage: async () => {}
      };
    }

    const useCase = new ValidateCouponUseCase(couponRepo);
    const result = await useCase.execute({ code, subtotalCents });

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
