import { json, type RequestHandler } from '@sveltejs/kit';
import { GetCatalogUseCase } from '@cardap/core';
import { PrismaCatalogRepository } from '@cardap/database';
import { SERVER_CATALOG } from '$lib/server/ordersStore';

export const GET: RequestHandler = async ({ url }) => {
  const searchQuery = url.searchParams.get('search') || undefined;
  const categorySlug = url.searchParams.get('category') || undefined;

  try {
    // Tenta consultar do repositório Prisma/PostgreSQL se a conexão estiver disponível
    const catalogRepo = new PrismaCatalogRepository();
    const useCase = new GetCatalogUseCase(catalogRepo);

    const result = await useCase.execute({
      channel: 'B2C',
      searchQuery,
      categorySlug
    });

    if (result.isSuccess) {
      return json({
        success: true,
        source: 'database',
        ...result.getValue()
      });
    }
  } catch (err) {
    // Fallback gracioso para a memória local do servidor
  }

  // Fallback para o catálogo do servidor
  let filtered = [...SERVER_CATALOG];
  if (categorySlug && categorySlug !== 'TODOS') {
    filtered = filtered.filter(p => p.category === categorySlug);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }

  return json({
    success: true,
    source: 'memory-fallback',
    products: filtered,
    totalProducts: filtered.length
  });
};
