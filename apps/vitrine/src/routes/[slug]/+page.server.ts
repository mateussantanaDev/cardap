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
        operatingHours: dbRest.operatingHours || 'Seg a Dom: 16:00 às 23:30',
        slaText: `${dbRest.slaMinutesMin}-${dbRest.slaMinutesMax} min`,
        deliveryFeeText: `R$ ${Number(dbRest.deliveryFee).toFixed(2).replace('.', ',')}`,
        deliveryFeeCents: Math.round(Number(dbRest.deliveryFee) * 100),
        minOrderText: `R$ ${Number(dbRest.minOrderValue).toFixed(2).replace('.', ',')}`,
        minOrderCents: Math.round(Number(dbRest.minOrderValue) * 100),
        phone: dbRest.phone || '(19) 99591-1878',
        address: `${dbRest.addressStreet || 'Av. Principal'}, ${dbRest.addressNumber || 'S/N'} — ${dbRest.addressNeighborhood || 'Centro'}, ${dbRest.addressCity || 'Garanhuns'}/${dbRest.addressState || 'PE'}`,
        isOpen: dbRest.isOpen,
        logoUrl: dbRest.logoUrl || '',
        bannerUrl: dbRest.bannerUrl || '',
        primaryColor: dbRest.primaryColor || '#dc2626',
        secondaryColor: dbRest.secondaryColor || '#0f172a',
        accentColor: dbRest.accentColor || '#f59e0b',
        paymentGateway: dbRest.paymentGateway || 'MERCADO_PAGO'
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
          operatingHours: firstRest.operatingHours || 'Seg a Dom: 16:00 às 23:30',
          slaText: `${firstRest.slaMinutesMin}-${firstRest.slaMinutesMax} min`,
          deliveryFeeText: `R$ ${Number(firstRest.deliveryFee).toFixed(2).replace('.', ',')}`,
          deliveryFeeCents: Math.round(Number(firstRest.deliveryFee) * 100),
          minOrderText: `R$ ${Number(firstRest.minOrderValue).toFixed(2).replace('.', ',')}`,
          minOrderCents: Math.round(Number(firstRest.minOrderValue) * 100),
          phone: firstRest.phone || '(19) 99591-1878',
          address: `${firstRest.addressStreet || 'Av. Principal'}, ${firstRest.addressNumber || 'S/N'} — ${firstRest.addressNeighborhood || 'Centro'}, ${firstRest.addressCity || 'Garanhuns'}/${firstRest.addressState || 'PE'}`,
          isOpen: firstRest.isOpen,
          logoUrl: firstRest.logoUrl || '',
          bannerUrl: firstRest.bannerUrl || '',
          primaryColor: firstRest.primaryColor || '#dc2626',
          secondaryColor: firstRest.secondaryColor || '#0f172a',
          accentColor: firstRest.accentColor || '#f59e0b',
          paymentGateway: firstRest.paymentGateway || 'MERCADO_PAGO'
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
