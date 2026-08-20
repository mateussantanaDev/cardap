import type { PageServerLoad } from './$types';
import { PrismaCatalogRepository, prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug;

  let restaurant: any = null;
  try {
    const dbRest = await prisma.restaurant.findUnique({
      where: { slug }
    });
    if (dbRest) {
      restaurant = {
        id: dbRest.id,
        slug: dbRest.slug,
        name: dbRest.name,
        category: dbRest.category || 'Restaurante',
        rating: '5.0 ★ (Novo)',
        operatingHours: dbRest.operatingHours || 'Consulte horários de funcionamento',
        slaText: `${dbRest.slaMinutesMin}-${dbRest.slaMinutesMax} min`,
        deliveryFeeText: Number(dbRest.deliveryFee) === 0 ? 'Grátis' : `R$ ${Number(dbRest.deliveryFee).toFixed(2).replace('.', ',')}`,
        deliveryFeeCents: Math.round(Number(dbRest.deliveryFee) * 100),
        minOrderText: `R$ ${Number(dbRest.minOrderValue).toFixed(2).replace('.', ',')}`,
        minOrderCents: Math.round(Number(dbRest.minOrderValue) * 100),
        phone: dbRest.phone || '',
        address: `${dbRest.addressStreet || ''} ${dbRest.addressNumber ? ', ' + dbRest.addressNumber : ''} ${dbRest.addressNeighborhood ? '— ' + dbRest.addressNeighborhood : ''} ${dbRest.addressCity ? ', ' + dbRest.addressCity : ''}${dbRest.addressState ? '/' + dbRest.addressState : ''}`.trim() || 'Endereço não informado',
        isOpen: dbRest.isOpen,
        logoUrl: dbRest.logoUrl || '',
        bannerUrl: dbRest.bannerUrl || '',
        primaryColor: dbRest.primaryColor || '#dc2626',
        secondaryColor: dbRest.secondaryColor || '#0f172a',
        accentColor: dbRest.accentColor || '#f59e0b',
        paymentGateway: dbRest.paymentGateway || 'MANUAL',
        highlights: (dbRest.highlights as any) || []
      };
    }
  } catch (e) {
    console.error('Erro ao buscar restaurante:', e);
  }

  // Buscar catálogo ativo do banco de dados (Prisma PostgreSQL)
  let categories: any[] = [];
  let products: any[] = [];

  if (restaurant) {
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
  }

  return {
    slug,
    restaurant,
    categories,
    products
  };
};
