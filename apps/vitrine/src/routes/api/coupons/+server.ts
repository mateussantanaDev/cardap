import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async () => {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = coupons.map(c => ({
      id: c.id,
      code: c.code,
      discount: c.discountType === 'PERCENTUAL'
        ? `${Number(c.discountValue)}% OFF`
        : `R$ ${Number(c.discountValue).toFixed(2).replace('.', ',')} OFF`,
      description: c.description || (c.minOrderValue ? `Válido para pedidos acima de R$ ${Number(c.minOrderValue).toFixed(2).replace('.', ',')}` : 'Desconto no seu pedido'),
      expiry: `Válido até ${c.endDate.toLocaleDateString('pt-BR')}`
    }));

    return json({
      success: true,
      coupons: formatted
    });
  } catch (err: any) {
    console.error('Erro ao buscar cupons reais:', err);
    return json({ success: false, error: err.message, coupons: [] }, { status: 500 });
  }
};
