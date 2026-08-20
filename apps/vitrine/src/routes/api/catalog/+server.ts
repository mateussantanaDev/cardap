import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaCatalogRepository } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

export const GET: RequestHandler = async ({ url }) => {
  try {
    const channel = url.searchParams.get('channel') || 'B2C';
    const categories = await catalogRepo.findActiveCategoriesWithProducts(channel as any);

    return json({
      success: true,
      source: 'database',
      categories: categories || []
    });
  } catch (err: any) {
    console.error('Erro ao consultar catálogo do banco na vitrine:', err.message);
    return json({
      success: true,
      source: 'empty_fallback',
      categories: [],
      message: 'Nenhum produto disponível no momento.'
    });
  }
};
