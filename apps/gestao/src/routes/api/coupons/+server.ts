import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const mapped = coupons.map(c => ({
      id: c.id,
      code: c.code,
      description: c.description || '',
      discountType: c.discountType === 'PERCENTUAL' ? 'PERCENTAGE' : 'FIXED',
      discountValue: c.discountType === 'PERCENTUAL' ? Number(c.discountValue) : Math.round(Number(c.discountValue) * 100),
      discountLabel: c.discountType === 'PERCENTUAL'
        ? `${Number(c.discountValue)}% OFF`
        : `R$ ${Number(c.discountValue).toFixed(2).replace('.', ',')} OFF`,
      minOrderCents: c.minOrderValue ? Math.round(Number(c.minOrderValue) * 100) : 0,
      expiryText: `Validade: ${c.endDate.toLocaleDateString('pt-BR')}`,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      usageLimit: c.usageLimit || undefined,
      currentUsages: c.currentUsages,
      isActive: c.isActive
    }));

    return json({
      success: true,
      coupons: mapped
    });
  } catch (err: any) {
    console.error('Erro ao listar cupons na gestão:', err);
    return json({ success: false, error: `Erro ao buscar cupons: ${err.message}` }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      code,
      description,
      discountType,
      discountValue,
      minOrderCents,
      startDate,
      endDate,
      usageLimit,
      isActive
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return json({ success: false, error: 'Código de cupom é obrigatório.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const isPercent = discountType === 'PERCENTAGE' || discountType === 'PERCENTUAL';
    const finalDiscountType = isPercent ? 'PERCENTUAL' : 'VALOR_FIXO';
    
    // Valor decimal para o banco
    const numValue = isPercent
      ? Number(discountValue || 0)
      : Number(discountValue || 0) > 100 ? Number(discountValue) / 100 : Number(discountValue || 0);

    const minOrderDecimal = minOrderCents && Number(minOrderCents) > 0
      ? Number(minOrderCents) / 100
      : null;

    const startDateTime = startDate ? new Date(startDate) : new Date();
    const endDateTime = endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 ano por padrão

    const coupon = await prisma.coupon.upsert({
      where: { code: cleanCode },
      create: {
        code: cleanCode,
        description: description || null,
        discountType: finalDiscountType,
        discountValue: numValue,
        minOrderValue: minOrderDecimal,
        startDate: startDateTime,
        endDate: endDateTime,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        isActive: isActive !== false
      },
      update: {
        description: description || null,
        discountType: finalDiscountType,
        discountValue: numValue,
        minOrderValue: minOrderDecimal,
        startDate: startDateTime,
        endDate: endDateTime,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        isActive: isActive !== false
      }
    });

    return json({
      success: true,
      coupon
    });
  } catch (err: any) {
    console.error('Erro ao salvar cupom:', err);
    return json({ success: false, error: `Erro ao salvar cupom: ${err.message}` }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    let id = url.searchParams.get('id');
    let code = url.searchParams.get('code');

    if (!id && !code) {
      try {
        const body = await request.json();
        id = body.id;
        code = body.code;
      } catch {}
    }

    if (!id && !code) {
      return json({ success: false, error: 'Informe o ID ou código do cupom para exclusão.' }, { status: 400 });
    }

    if (id) {
      await prisma.coupon.deleteMany({ where: { id } });
    } else if (code) {
      await prisma.coupon.deleteMany({ where: { code: code.trim().toUpperCase() } });
    }

    return json({
      success: true,
      message: 'Cupom excluído com sucesso.'
    });
  } catch (err: any) {
    console.error('Erro ao deletar cupom:', err);
    return json({ success: false, error: `Erro ao excluir cupom: ${err.message}` }, { status: 500 });
  }
};
