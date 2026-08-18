import { ICatalogRepository, CatalogCategoryData, CatalogProductData } from '../../domain/repositories/ICatalogRepository';
import { Result } from '../../shared/Result';
import { DomainError, InvalidCatalogError } from '../../shared/DomainError';

export interface GetCatalogInputDTO {
  channel?: 'B2C' | 'B2B';
  searchQuery?: string;
  categorySlug?: string;
}

export interface GetCatalogOutputDTO {
  categories: CatalogCategoryData[];
  products: CatalogProductData[];
  totalProducts: number;
}

/**
 * Caso de Uso: Consulta do Catálogo de Produtos B2C / B2B
 * Retorna as categorias ativas e produtos com todas as etapas de montagem e adicionais.
 */
export class GetCatalogUseCase {
  constructor(private catalogRepo: ICatalogRepository) {}

  async execute(request: GetCatalogInputDTO = {}): Promise<Result<GetCatalogOutputDTO, DomainError>> {
    try {
      const channel = request.channel || 'B2C';
      
      let categories = await this.catalogRepo.findActiveCategoriesWithProducts(channel);
      
      if (request.categorySlug && request.categorySlug !== 'TODOS') {
        categories = categories.filter(c => c.slug.toLowerCase() === request.categorySlug?.toLowerCase());
      }

      let allProducts: CatalogProductData[] = [];
      for (const cat of categories) {
        allProducts.push(...cat.products);
      }

      if (request.searchQuery && request.searchQuery.trim().length > 0) {
        const query = request.searchQuery.trim().toLowerCase();
        allProducts = allProducts.filter(
          p => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
        );
      }

      return Result.ok({
        categories,
        products: allProducts,
        totalProducts: allProducts.length
      });
    } catch (err: any) {
      return Result.fail(new InvalidCatalogError(`Erro ao carregar catálogo: ${err.message}`));
    }
  }
}
