import type { PageServerLoad } from './$types';
import { PrismaCatalogRepository } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let products: any[] = [];
  let categories: string[] = ['TODOS'];

  try {
    const rawCategories = await catalogRepo.findActiveCategoriesWithProducts('B2B');
    for (const cat of rawCategories) {
      const catName = cat.name.toUpperCase();
      if (!categories.includes(catName)) {
        categories.push(catName);
      }
      for (const prod of cat.products || []) {
        products.push({
          id: prod.id,
          code: prod.code || 'PROD',
          category: catName,
          name: prod.name,
          priceCents: prod.priceCents !== undefined ? Number(prod.priceCents) : Math.round(Number(prod.price || 0) * 100)
        });
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar catálogo no PDV SSR:', err);
  }

  return {
    products,
    categories
  };
};
