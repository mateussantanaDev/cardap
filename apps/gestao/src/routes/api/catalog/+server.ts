import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaCatalogRepository, prisma } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

function cleanSlug(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'categoria';
}

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
    const {
      id,
      categoryName,
      categoryId,
      code,
      name,
      description,
      basePriceCents,
      price,
      isAssembly,
      isActive,
      imageUrl
    } = body;

    if (!name || !name.trim()) {
      return json({ success: false, error: 'O nome do produto é obrigatório.' }, { status: 400 });
    }

    const finalPrice = price !== undefined ? Number(price) : (Number(basePriceCents || 0) / 100);

    // 1. Resolver Categoria de forma segura e resiliente
    let targetCategoryId = categoryId;
    let foundCategory = null;

    if (targetCategoryId) {
      foundCategory = await prisma.category.findUnique({ where: { id: targetCategoryId } });
    }

    if (!foundCategory && categoryName) {
      const searchSlug = cleanSlug(categoryName);
      
      // Busca 1: Pelo nome case-insensitive ou pelo slug limpo
      foundCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: searchSlug },
            { name: { equals: categoryName.trim(), mode: 'insensitive' } },
            { name: { contains: categoryName.trim(), mode: 'insensitive' } }
          ]
        }
      });

      // Busca 2: Se não achou, tenta criar com slug único garantido
      if (!foundCategory) {
        let uniqueSlug = searchSlug;
        const slugExists = await prisma.category.findUnique({ where: { slug: uniqueSlug } });
        if (slugExists) {
          uniqueSlug = `${searchSlug}-${Math.floor(100 + Math.random() * 900)}`;
        }

        foundCategory = await prisma.category.create({
          data: {
            name: categoryName.trim(),
            slug: uniqueSlug,
            isActive: true,
            showInB2C: true,
            showInB2B: true
          }
        });
      }
    }

    // Busca 3: Se ainda não tiver categoria, seleciona a primeira existente no banco
    if (!foundCategory) {
      foundCategory = await prisma.category.findFirst({ where: { isActive: true } });
    }

    // Busca 4: Se nenhuma categoria existir no banco, cria uma padrão
    if (!foundCategory) {
      foundCategory = await prisma.category.create({
        data: {
          name: 'Cardápio Geral',
          slug: 'geral',
          isActive: true,
          showInB2C: true,
          showInB2B: true
        }
      });
    }

    targetCategoryId = foundCategory.id;

    // 2. Verificar se estamos atualizando um produto existente
    let product;
    let isExisting = false;

    if (id && id.length === 36) {
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (existingProduct) {
        isExisting = true;
      }
    }

    if (isExisting && id) {
      // Atualização de Produto Existente
      let safeCode = (code || '').trim();
      if (safeCode) {
        // Verificar se outro produto já usa esse código
        const codeConflict = await prisma.product.findFirst({
          where: {
            code: safeCode,
            id: { not: id }
          }
        });
        if (codeConflict) {
          safeCode = `${safeCode}-${Math.floor(100 + Math.random() * 900)}`;
        }
      }

      product = await prisma.product.update({
        where: { id },
        data: {
          categoryId: targetCategoryId,
          ...(safeCode ? { code: safeCode } : {}),
          name: name.trim(),
          description: description !== undefined ? description : '',
          price: finalPrice,
          imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
          isAssembly: Boolean(isAssembly),
          isActive: isActive !== false
        }
      });
      console.log(`[ERP Catálogo] Produto existente atualizado: '${product.name}' (ID: ${product.id}, SKU: ${product.code})`);
    } else {
      // Criação de Novo Produto com SKU Garantido Único
      let candidateCode = (code || '').trim() || `PROD-${Math.floor(100 + Math.random() * 900)}`;
      let codeTaken = await prisma.product.findUnique({ where: { code: candidateCode } });
      let counter = 1;
      while (codeTaken && counter <= 20) {
        candidateCode = `${(code || 'PROD').trim()}-${Math.floor(100 + Math.random() * 900)}`;
        codeTaken = await prisma.product.findUnique({ where: { code: candidateCode } });
        counter++;
      }
      if (codeTaken) {
        candidateCode = `PROD-${Date.now()}`;
      }

      product = await prisma.product.create({
        data: {
          categoryId: targetCategoryId,
          code: candidateCode,
          name: name.trim(),
          description: description || '',
          price: finalPrice,
          imageUrl: imageUrl || null,
          isAssembly: Boolean(isAssembly),
          isActive: isActive !== false,
          showInB2C: true,
          showInB2B: true
        }
      });
      console.log(`[ERP Catálogo] Novo produto criado com sucesso: '${product.name}' (SKU: ${product.code}, ID: ${product.id})`);
    }

    return json({ success: true, product });
  } catch (err: any) {
    console.error('[ERP Catálogo] Erro fatal ao salvar produto:', err);
    return json({ success: false, error: err.message || 'Erro ao salvar produto no catálogo.' }, { status: 500 });
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
