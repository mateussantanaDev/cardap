import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaCatalogRepository } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

export const GET: RequestHandler = async ({ url }) => {
  try {
    const categories = await catalogRepo.findActiveCategoriesWithProducts('B2C');

    return json({
      success: true,
      source: 'database',
      categories
    });
  } catch (err: any) {
    console.error('Erro ao consultar catálogo do banco na vitrine:', err.message);
    return json({
      success: false,
      error: `Erro ao buscar catálogo: ${err.message}`
    }, { status: 500 });
  }
};
