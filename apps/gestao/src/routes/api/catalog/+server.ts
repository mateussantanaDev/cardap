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
    const { id, categoryName, categoryId, code, name, description, basePriceCents, price, isAssembly, isActive } = body;

    const finalPrice = price !== undefined ? Number(price) : (Number(basePriceCents) / 100);

    // Encontrar ou criar categoria se informada por nome
    let targetCategoryId = categoryId;
    if (!targetCategoryId && categoryName) {
      const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
      let cat = await prisma.category.findFirst({
        where: {
          OR: [
            { slug },
            { name: { equals: categoryName, mode: 'insensitive' } }
          ]
        }
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            name: categoryName,
            slug,
            isActive: true,
            showInB2C: true,
            showInB2B: true
          }
        });
      }
      targetCategoryId = cat.id;
    }

    if (!targetCategoryId) {
      const firstCat = await prisma.category.findFirst();
      targetCategoryId = firstCat?.id;
    }

    if (!targetCategoryId) {
      return json({ success: false, error: 'Categoria não encontrada.' }, { status: 400 });
    }

    let product;
    if (id && id.length === 36) {
      // UUID válido, atualiza no PostgreSQL
      product = await prisma.product.upsert({
        where: { id },
        create: {
          id,
          categoryId: targetCategoryId,
          code: code || `PROD-${Math.floor(100 + Math.random() * 900)}`,
          name,
          description: description || '',
          price: finalPrice,
          isAssembly: Boolean(isAssembly),
          isActive: isActive !== false,
          showInB2C: true,
          showInB2B: true
        },
        update: {
          categoryId: targetCategoryId,
          name,
          description: description || '',
          price: finalPrice,
          isAssembly: Boolean(isAssembly),
          isActive: isActive !== false
        }
      });
    } else {
      // Criar novo produto ou buscar pelo code
      const prodCode = code || `PROD-${Math.floor(100 + Math.random() * 900)}`;
      product = await prisma.product.upsert({
        where: { code: prodCode },
        create: {
          categoryId: targetCategoryId,
          code: prodCode,
          name,
          description: description || '',
          price: finalPrice,
          isAssembly: Boolean(isAssembly),
          isActive: isActive !== false,
          showInB2C: true,
          showInB2B: true
        },
        update: {
          categoryId: targetCategoryId,
          name,
          description: description || '',
          price: finalPrice,
          isAssembly: Boolean(isAssembly),
          isActive: isActive !== false
        }
      });
    }

    console.log(`[ERP Catálogo] Produto '${product.name}' (${product.code}) salvo no PostgreSQL com preço R$ ${Number(product.price).toFixed(2)}`);

    return json({ success: true, product });
  } catch (err: any) {
    console.error('Erro ao salvar produto no banco:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return json({ success: false, error: 'ID do produto é obrigatório' }, { status: 400 });

  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
    return json({ success: true });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
