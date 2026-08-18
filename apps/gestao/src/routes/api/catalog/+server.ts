import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaCatalogRepository, prisma } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

export const GET: RequestHandler = async ({ url }) => {
  try {
    const channel = url.searchParams.get('channel') === 'B2C' ? 'B2C' : 'B2B';
    const categories = await catalogRepo.findActiveCategoriesWithProducts(channel);

    return json({
      success: true,
      source: 'database',
      categories
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao buscar catálogo: ${err.message}` }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { categoryId, code, name, description, price, isAssembly } = body;

    const product = await prisma.product.create({
      data: {
        categoryId,
        code,
        name,
        description,
        price,
        isAssembly: Boolean(isAssembly),
        isActive: true,
        showInB2C: true,
        showInB2B: true
      }
    });

    return json({ success: true, product });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
