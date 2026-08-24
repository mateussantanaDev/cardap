import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { randomUUID } from 'node:crypto';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const rawList = await prisma.ingredient.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    const items = rawList.map(raw => {
      const current = Number(raw.currentStock);
      const min = Number(raw.minStock);
      const costCents = Math.round(Number(raw.costPrice) * 100);

      let status: 'NORMAL' | 'BAIXO' | 'CRITICO' = 'NORMAL';
      if (current <= min * 0.5) {
        status = 'CRITICO';
      } else if (current <= min) {
        status = 'BAIXO';
      }

      return {
        id: raw.id,
        code: raw.code,
        name: raw.name,
        category: 'INSUMO',
        currentQuantity: current,
        unit: raw.unit,
        minQuantity: min,
        unitCostCents: costCents,
        supplier: 'Fornecedor Padrão',
        lastRestockDate: new Date(raw.updatedAt).toLocaleDateString('pt-BR'),
        status
      };
    });

    return json({
      success: true,
      items,
      lowStockAlertCount: items.filter(i => i.status !== 'NORMAL').length
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao listar insumos do estoque: ${err.message}` }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, code, name, category, currentQuantity, unit, minQuantity, unitCostCents, supplier } = body;

    if (!name || !name.trim()) {
      return json({ success: false, error: 'O nome do insumo é obrigatório.' }, { status: 400 });
    }

    const validUnits = ['KG', 'G', 'L', 'ML', 'UN'];
    const safeUnit = validUnits.includes(unit) ? unit : 'UN';
    const safeCode = code && code.trim() ? code.trim() : `INS-${Date.now().toString().slice(-4)}`;
    const costPriceDecimal = (Number(unitCostCents || 1000) / 100).toFixed(4);
    const currentStockDecimal = Number(currentQuantity || 0);
    const minStockDecimal = Number(minQuantity || 5);

    const ingredient = await prisma.ingredient.upsert({
      where: { id: id && id.length > 10 ? id : randomUUID() },
      create: {
        code: safeCode,
        name: name.trim(),
        unit: safeUnit as any,
        costPrice: costPriceDecimal as any,
        currentStock: currentStockDecimal as any,
        minStock: minStockDecimal as any,
        isActive: true
      },
      update: {
        name: name.trim(),
        unit: safeUnit as any,
        costPrice: costPriceDecimal as any,
        currentStock: currentStockDecimal as any,
        minStock: minStockDecimal as any,
        isActive: true
      }
    });

    return json({
      success: true,
      item: {
        id: ingredient.id,
        code: ingredient.code,
        name: ingredient.name,
        category: category || 'INSUMO',
        currentQuantity: Number(ingredient.currentStock),
        unit: ingredient.unit,
        minQuantity: Number(ingredient.minStock),
        unitCostCents: Math.round(Number(ingredient.costPrice) * 100),
        supplier: supplier || 'Fornecedor Padrão',
        lastRestockDate: new Date().toLocaleDateString('pt-BR'),
        status: Number(ingredient.currentStock) <= Number(ingredient.minStock) ? 'BAIXO' : 'NORMAL'
      }
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao salvar insumo: ${err.message}` }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return json({ success: false, error: 'Informe o ID do insumo a ser excluído.' }, { status: 400 });
    }

    // Tenta remover receitas e movimentos associados antes de deletar, ou desativa suavemente
    try {
      await prisma.inventoryMovement.deleteMany({ where: { ingredientId: id } });
      await prisma.productRecipe.deleteMany({ where: { ingredientId: id } });
      await prisma.ingredient.delete({ where: { id } });
    } catch (e) {
      // Fallback de soft delete caso tenha chaves estrangeiras restritivas
      await prisma.ingredient.update({
        where: { id },
        data: { isActive: false }
      });
    }

    return json({ success: true, message: 'Insumo excluído com sucesso.' });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao excluir insumo: ${err.message}` }, { status: 500 });
  }
};
