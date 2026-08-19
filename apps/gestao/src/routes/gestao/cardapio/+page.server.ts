import type { PageServerLoad } from './$types';
import { prisma, PrismaCatalogRepository } from '@cardap/database';

const catalogRepo = new PrismaCatalogRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let categories: any[] = [];
  let coupons: any[] = [];

  try {
    const rawCategories = await catalogRepo.findActiveCategoriesWithProducts('B2B');
    categories = rawCategories.map((c: any) => ({
      id: c.id,
      name: c.name.toUpperCase(),
      slug: c.slug,
      itemCount: (c.products || []).length,
      isActive: c.isActive !== false,
      products: (c.products || []).map((p: any) => ({
        id: p.id,
        code: p.code || 'PROD',
        category: c.name.toUpperCase(),
        categoryId: c.id,
        name: p.name,
        description: p.description || '',
        basePriceCents: p.priceCents !== undefined ? Number(p.priceCents) : Math.round(Number(p.price || 0) * 100),
        isCustomizable: Boolean(p.isAssembly),
        isActive: p.isActive !== false,
        imageUrl: p.imageUrl,
        assemblyGroups: p.assemblyGroups || []
      }))
    }));

    const rawCoupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    coupons = rawCoupons.map((cp: any) => ({
      id: cp.id,
      code: cp.code,
      discountType: cp.discountType,
      discountValue: cp.discountType === 'PERCENTUAL' ? cp.percentage : cp.fixedDiscountCents,
      discountLabel: cp.discountType === 'PERCENTUAL' ? `${cp.percentage}% OFF` : `R$ ${(cp.fixedDiscountCents / 100).toFixed(2)} OFF`,
      description: cp.description || '',
      minOrderCents: cp.minOrderCents || 0,
      expiryText: cp.expiresAt ? `Validade: ${new Date(cp.expiresAt).toLocaleDateString('pt-BR')}` : 'Validade indeterminada',
      isActive: cp.isActive
    }));
  } catch (err) {
    console.warn('Erro ao carregar cardápio no SSR:', err);
  }

  return {
    categories,
    coupons
  };
};
