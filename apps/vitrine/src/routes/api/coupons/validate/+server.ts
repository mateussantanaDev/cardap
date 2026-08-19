import { json, type RequestHandler } from '@sveltejs/kit';
import { ValidateCouponUseCase } from '@cardap/core';
import { PrismaCouponRepository } from '@cardap/database';

// Cupons em memória para fallback se banco não estiver conectado
const MOCK_COUPONS: Record<string, any> = {
  ESPANKA10: {
    id: 'c-espanka10',
    code: 'ESPANKA10',
    description: 'R$ 10,00 de desconto em pedidos acima de R$ 40,00',
    discountType: 'VALOR_FIXO',
    discountValue: 10.00,
    minOrderValueCents: 4000,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    currentUsages: 1,
    isActive: true
  },
  PRIMEIRO10: {
    id: 'c-primeiro10',
    code: 'PRIMEIRO10',
    description: '10% de desconto no primeiro pedido',
    discountType: 'PERCENTUAL',
    discountValue: 10,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    currentUsages: 0,
    isActive: true
  },
  FRETEGRATIS: {
    id: 'c-frete',
    code: 'FRETEGRATIS',
    description: 'Isenção de taxa de entrega',
    discountType: 'VALOR_FIXO',
    discountValue: 8.50,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    currentUsages: 12,
    isActive: true
  },
  CARDAP10: {
    id: 'c-cardap10',
    code: 'CARDAP10',
    description: '10% de desconto',
    discountType: 'PERCENTUAL',
    discountValue: 10,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    currentUsages: 5,
    isActive: true
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { code } = body;
    const subtotalCents = body.subtotalCents && Number(body.subtotalCents) > 0 ? Number(body.subtotalCents) : 5000;

    if (!code || typeof code !== 'string') {
      return json({ success: false, error: 'Código de cupom é obrigatório.' }, { status: 400 });
    }

    let couponRepo;
    try {
      couponRepo = new PrismaCouponRepository();
    } catch {
      couponRepo = {
        findByCode: async (c: string) => MOCK_COUPONS[c.toUpperCase()] || null,
        incrementUsage: async () => {}
      };
    }

    const useCase = new ValidateCouponUseCase(couponRepo);
    let result = await useCase.execute({ code, subtotalCents });

    // Se falhar no banco (ex: cupom ainda não criado no banco de produção), tentar mock
    if (result.isFailure && MOCK_COUPONS[code.toUpperCase()]) {
      const mockRepo = {
        findByCode: async (c: string) => MOCK_COUPONS[c.toUpperCase()] || null,
        incrementUsage: async () => {}
      };
      const mockUseCase = new ValidateCouponUseCase(mockRepo);
      result = await mockUseCase.execute({ code, subtotalCents });
    }

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
