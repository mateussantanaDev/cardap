import { prisma } from '../client.js';
import {
  ICatalogRepository,
  CatalogCategoryData,
  CatalogProductData,
  CatalogGroupData,
  CatalogOptionData
} from '@cardap/core';

export class PrismaCatalogRepository implements ICatalogRepository {
  async findActiveCategoriesWithProducts(channel: 'B2C' | 'B2B' = 'B2C'): Promise<CatalogCategoryData[]> {
    const isB2C = channel === 'B2C';

    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        ...(isB2C ? { showInB2C: true } : { showInB2B: true })
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: {
            isActive: true,
            ...(isB2C ? { showInB2C: true } : { showInB2B: true })
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            assemblyGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  where: { isActive: true }
                }
              }
            },
            modifierGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  where: { isActive: true }
                }
              }
            },
            complementGroups: {
              include: {
                options: {
                  where: { isActive: true }
                }
              }
            }
          }
        }
      }
    });

    return categories.map(cat => this.mapCategoryToDomain(cat));
  }

  async findProductById(productId: string): Promise<CatalogProductData | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        assemblyGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              where: { isActive: true }
            }
          }
        },
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              where: { isActive: true }
            }
          }
        },
        complementGroups: {
          include: {
            options: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!product) return null;
    return this.mapProductToDomain(product);
  }

  async searchProducts(query: string, channel: 'B2C' | 'B2B' = 'B2C'): Promise<CatalogProductData[]> {
    const isB2C = channel === 'B2C';

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(isB2C ? { showInB2C: true } : { showInB2B: true }),
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        assemblyGroups: {
          include: { options: { where: { isActive: true } } }
        }
      }
    });

    return products.map(p => this.mapProductToDomain(p));
  }

  private mapCategoryToDomain(prismaCategory: any): CatalogCategoryData {
    return {
      id: prismaCategory.id,
      name: prismaCategory.name,
      slug: prismaCategory.slug,
      description: prismaCategory.description || undefined,
      sortOrder: prismaCategory.sortOrder,
      isActive: prismaCategory.isActive,
      showInB2C: prismaCategory.showInB2C,
      showInB2B: prismaCategory.showInB2B,
      products: (prismaCategory.products || []).map((p: any) => this.mapProductToDomain(p))
    };
  }

  private mapProductToDomain(prismaProduct: any): CatalogProductData {
    const mapGroup = (grp: any): CatalogGroupData => ({
      id: grp.id,
      name: grp.name,
      minChoices: grp.minChoices,
      maxChoices: grp.maxChoices,
      isRequired: grp.isRequired,
      sortOrder: grp.sortOrder || 0,
      options: (grp.options || []).map((opt: any): CatalogOptionData => ({
        id: opt.id,
        name: opt.name,
        priceAdjustmentCents: Math.round(Number(opt.priceAdjustment || opt.price || 0) * 100),
        isDefault: opt.isDefault || false,
        isActive: opt.isActive
      }))
    });

    return {
      id: prismaProduct.id,
      categoryId: prismaProduct.categoryId,
      code: prismaProduct.code,
      name: prismaProduct.name,
      description: prismaProduct.description || undefined,
      priceCents: Math.round(Number(prismaProduct.price) * 100),
      imageUrl: prismaProduct.imageUrl || undefined,
      isAssembly: prismaProduct.isAssembly,
      isActive: prismaProduct.isActive,
      showInB2C: prismaProduct.showInB2C,
      showInB2B: prismaProduct.showInB2B,
      sortOrder: prismaProduct.sortOrder,
      assemblyGroups: (prismaProduct.assemblyGroups || []).map(mapGroup),
      modifierGroups: (prismaProduct.modifierGroups || []).map(mapGroup),
      complementGroups: (prismaProduct.complementGroups || []).map(mapGroup)
    };
  }
}
