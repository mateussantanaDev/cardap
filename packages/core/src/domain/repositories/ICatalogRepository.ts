export interface CatalogOptionData {
  id: string;
  name: string;
  priceAdjustmentCents: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CatalogGroupData {
  id: string;
  name: string;
  minChoices: number;
  maxChoices: number;
  isRequired: boolean;
  sortOrder: number;
  options: CatalogOptionData[];
}

export interface CatalogProductData {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description?: string;
  priceCents: number;
  imageUrl?: string;
  isAssembly: boolean;
  isActive: boolean;
  showInB2C: boolean;
  showInB2B: boolean;
  sortOrder: number;
  assemblyGroups?: CatalogGroupData[];
  modifierGroups?: CatalogGroupData[];
  complementGroups?: CatalogGroupData[];
}

export interface CatalogCategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  showInB2C: boolean;
  showInB2B: boolean;
  products: CatalogProductData[];
}

export interface ICatalogRepository {
  findActiveCategoriesWithProducts(channel?: 'B2C' | 'B2B'): Promise<CatalogCategoryData[]>;
  findProductById(productId: string): Promise<CatalogProductData | null>;
  searchProducts(query: string, channel?: 'B2C' | 'B2B'): Promise<CatalogProductData[]>;
}
