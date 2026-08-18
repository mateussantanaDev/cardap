import { json, type RequestHandler } from '@sveltejs/kit';
import { GetInventoryStatusUseCase } from '@cardap/core';
import { PrismaInventoryRepository } from '@cardap/database';

const inventoryRepo = new PrismaInventoryRepository();
const statusUseCase = new GetInventoryStatusUseCase(inventoryRepo);

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const list = await statusUseCase.execute();

    return json({
      success: true,
      ingredients: list,
      lowStockAlertCount: list.filter(i => i.isBelowMinimum).length
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao listar insumos do estoque: ${err.message}` }, { status: 500 });
  }
};
