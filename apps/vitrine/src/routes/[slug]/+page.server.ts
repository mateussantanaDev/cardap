import type { PageServerLoad } from './$types';
import { PrismaCatalogRepository, prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug || 'imperius-do-pastel';

  let restaurant: any = null;
  try {
    const dbRest = await prisma.restaurant.findUnique({
      where: { slug }
    });
    if (dbRest) {
      restaurant = {
        slug: dbRest.slug,
        name: dbRest.name,
        category: dbRest.category,
        rating: '5.0 ★ (2.4k avaliações)',
        operatingHours: 'Seg a Dom: 16:00 às 23:30',
        slaText: `${dbRest.slaMinutesMin}-${dbRest.slaMinutesMax} min`,
        deliveryFeeText: `R$ ${Number(dbRest.deliveryFee).toFixed(2).replace('.', ',')}`,
        minOrderText: `R$ ${Number(dbRest.minOrderValue).toFixed(2).replace('.', ',')}`,
        phone: dbRest.phone || '(87) 99812-3456',
        address: `${dbRest.addressStreet || 'Av. Principal'}, ${dbRest.addressNumber || 'S/N'} — ${dbRest.addressNeighborhood || 'Centro'}, ${dbRest.addressCity || 'Garanhuns'}/${dbRest.addressState || 'PE'}`,
        isOpen: dbRest.isOpen
      };
    }
  } catch (e) {
    // Fallback
  }

  if (!restaurant) {
    try {
      const firstRest = await prisma.restaurant.findFirst();
      if (firstRest) {
        restaurant = {
          slug: firstRest.slug,
          name: firstRest.name,
          category: firstRest.category,
          rating: '5.0 ★ (2.4k avaliações)',
          operatingHours: 'Seg a Dom: 16:00 às 23:30',
          slaText: `${firstRest.slaMinutesMin}-${firstRest.slaMinutesMax} min`,
          deliveryFeeText: `R$ ${Number(firstRest.deliveryFee).toFixed(2).replace('.', ',')}`,
          minOrderText: `R$ ${Number(firstRest.minOrderValue).toFixed(2).replace('.', ',')}`,
          phone: firstRest.phone || '(87) 99812-3456',
          address: `${firstRest.addressStreet || 'Av. Principal'}, ${firstRest.addressNumber || 'S/N'} — ${firstRest.addressNeighborhood || 'Centro'}, ${firstRest.addressCity || 'Garanhuns'}/${firstRest.addressState || 'PE'}`,
          isOpen: firstRest.isOpen
        };
      }
    } catch {}
  }

  // Buscar catálogo ativo do banco de dados (Prisma PostgreSQL)
  let categories: any[] = [];
  let products: any[] = [];

  try {
    const catalogRepo = new PrismaCatalogRepository();
    const dbCategories = await catalogRepo.findActiveCategoriesWithProducts('B2C');

    if (dbCategories && dbCategories.length > 0) {
      for (const cat of dbCategories) {
        categories.push({
          id: cat.slug.toUpperCase(),
          label: cat.name
        });

        for (const p of cat.products || []) {
          products.push({
            id: p.id,
            code: p.code || 'PROD',
            category: cat.slug.toUpperCase(),
            name: p.name,
            description: p.description || '',
            basePriceCents: p.priceCents,
            isCustomizable: Boolean(p.isAssembly),
            imageUrl: p.imageUrl,
            assemblyGroups: p.assemblyGroups || []
          });
        }
      }
    }
  } catch (err) {
    console.error('Erro ao carregar catálogo ao vivo no SSR:', err);
  }

  return {
    slug: restaurant?.slug || slug,
    restaurant,
    categories,
    products
  };
};
