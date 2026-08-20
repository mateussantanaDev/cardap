import { writable } from 'svelte/store';

export interface VitrineTenant {
  slug: string;
  name: string;
  category: string;
  rating: string;
  operatingHours: string;
  slaText: string;
  deliveryFeeText: string;
  minOrderText: string;
  phone: string;
  address: string;
  isOpen: boolean;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  categories: { id: string; label: string }[];
  products: {
    id: string;
    code: string;
    category: string;
    name: string;
    description: string;
    basePriceCents: number;
    isCustomizable?: boolean;
    imageUrl?: string;
    assemblyGroups?: any[];
  }[];
}

export const TENANT_DATABASE: Record<string, VitrineTenant> = {};

function createTenantVitrineStore() {
  const currentSlug = writable<string>('');

  return {
    currentSlug,
    setSlug: (slug: string) => currentSlug.set(slug),
    getTenant: (slug: string): VitrineTenant | null => {
      return TENANT_DATABASE[slug] || null;
    }
  };
}

export const tenantVitrineManager = createTenantVitrineStore();
