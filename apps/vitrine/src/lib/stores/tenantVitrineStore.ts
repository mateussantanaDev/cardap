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

export const TENANT_DATABASE: Record<string, VitrineTenant> = {
  'imperius-do-pastel': {
    slug: 'imperius-do-pastel',
    name: 'IMPERIUS DO PASTEL',
    category: 'Pastelaria Artesanal & Caldos de Cana · Garanhuns',
    rating: '5.0 ★ (2.4k avaliações)',
    operatingHours: 'Seg a Dom: 16:00 às 23:30',
    slaText: '20-40 min',
    deliveryFeeText: 'R$ 6,00',
    minOrderText: 'R$ 15,00',
    phone: '(87) 99812-3456',
    address: 'Av. Rui Barbosa, 450 — Centro, Garanhuns/PE',
    isOpen: true,
    categories: [
      { id: 'MONTE', label: 'Monte Seu Pastel' },
      { id: 'TRADICIONAIS', label: 'Pastéis Tradicionais' },
      { id: 'ESPECIAIS', label: 'Nobres & Gourmet' },
      { id: 'DOCES', label: 'Pastéis Doces' },
      { id: 'PORCOES', label: 'Porções' },
      { id: 'BEBIDAS', label: 'Bebidas & Caldos' }
    ],
    products: [
      {
        id: 'past-1',
        code: 'PAST-01',
        category: 'MONTE',
        name: 'Monte seu Pastel Imperius (25cm)',
        description: 'Personalize o tamanho, a massa crocante, 1 recheio base e até 3 queijos/adicionais especiais.',
        basePriceCents: 2300,
        isCustomizable: true,
        assemblyGroups: [
          {
            id: 'g-massa',
            name: '1. Escolha a Massa Artesanal',
            minChoices: 1,
            maxChoices: 1,
            isRequired: true,
            options: [
              { id: 'm1', name: 'Massa Tradicional Crocante', priceAdjustmentCents: 0 },
              { id: 'm2', name: 'Massa Especial com Ervas Nobres', priceAdjustmentCents: 200 },
              { id: 'm3', name: 'Massa com Pimenta Suave', priceAdjustmentCents: 200 }
            ]
          },
          {
            id: 'g-recheio',
            name: '2. Escolha o Recheio Principal (130g)',
            minChoices: 1,
            maxChoices: 1,
            isRequired: true,
            options: [
              { id: 'r1', name: 'Carne Bovina Moída de Primeira', priceAdjustmentCents: 0 },
              { id: 'r2', name: 'Peito de Frango Desfiado Temperado', priceAdjustmentCents: 0 },
              { id: 'r3', name: 'Queijo Coalho Grelhado do Agreste', priceAdjustmentCents: 0 },
              { id: 'r4', name: 'Camarão Salteado ao Azeite', priceAdjustmentCents: 850 },
              { id: 'r5', name: 'Costela Bovina Desfiada ao Barbecue', priceAdjustmentCents: 700 }
            ]
          },
          {
            id: 'g-queijos',
            name: '3. Adicione Queijos & Toques (Até 3)',
            minChoices: 0,
            maxChoices: 3,
            isRequired: false,
            options: [
              { id: 'q1', name: 'Catupiry Original Requeijão Cremoso', priceAdjustmentCents: 350 },
              { id: 'q2', name: 'Mussarela Derretida em Fatias', priceAdjustmentCents: 300 },
              { id: 'q3', name: 'Cheddar Cremoso Especial', priceAdjustmentCents: 350 },
              { id: 'q4', name: 'Bacon em Cubos Crocantes', priceAdjustmentCents: 350 },
              { id: 'q5', name: 'Milho Doce & Azeitonas', priceAdjustmentCents: 200 }
            ]
          }
        ]
      },
      {
        id: 'past-2',
        code: 'PAST-02',
        category: 'TRADICIONAIS',
        name: 'Pastel de Carne com Queijo Coalho',
        description: 'Carne moída bovina temperada com especiarias e generoso queijo coalho do Agreste derretido.',
        basePriceCents: 1850,
        isCustomizable: false
      },
      {
        id: 'past-3',
        code: 'PAST-03',
        category: 'TRADICIONAIS',
        name: 'Pastel de Frango com Catupiry Original',
        description: 'Peito de frango desfiado suculento com o legítimo requeijão Catupiry.',
        basePriceCents: 1800,
        isCustomizable: false
      },
      {
        id: 'past-4',
        code: 'PAST-04',
        category: 'TRADICIONAIS',
        name: 'Pastel 4 Queijos Imperius',
        description: 'Combinação harmônica de Mussarela, Catupiry, Queijo Coalho e Provolone defumado.',
        basePriceCents: 1950,
        isCustomizable: false
      },
      {
        id: 'past-5',
        code: 'PAST-05',
        category: 'ESPECIAIS',
        name: 'Pastel de Costela Desfiada & Barbecue',
        description: 'Costela bovina assada lentamente por 8 horas, desfiada com molho barbecue e mussarela.',
        basePriceCents: 2200,
        isCustomizable: false
      },
      {
        id: 'past-6',
        code: 'PAST-06',
        category: 'ESPECIAIS',
        name: 'Pastel de Camarão ao Cream Cheese',
        description: 'Camarões selecionados salteados no azeite de ervas, alho-poró e cream cheese.',
        basePriceCents: 2450,
        isCustomizable: false
      },
      {
        id: 'past-7',
        code: 'PAST-07',
        category: 'DOCES',
        name: 'Pastel Romeu & Julieta Especial',
        description: 'Goiabada cascão cremosa com queijo derretido, salpicado com açúcar e canela.',
        basePriceCents: 1500,
        isCustomizable: false
      },
      {
        id: 'past-8',
        code: 'PAST-08',
        category: 'DOCES',
        name: 'Pastel de Nutella com Morangos',
        description: 'Muita Nutella original com pedaços de morangos frescos na massa quentinha e crocante.',
        basePriceCents: 1850,
        isCustomizable: false
      },
      {
        id: 'porc-1',
        code: 'PORC-01',
        category: 'PORCOES',
        name: 'Porção de 12 Mini Pastéis Sortidos',
        description: '12 mini pastéis crocantes nos sabores carne, queijo e frango. Acompanha vinagrete da casa.',
        basePriceCents: 2800,
        isCustomizable: false
      },
      {
        id: 'beb-1',
        code: 'BEB-01',
        category: 'BEBIDAS',
        name: 'Caldo de Cana Gelado Tradicional 500ml',
        description: 'Moído na hora com cana fresca e filtrada.',
        basePriceCents: 800,
        isCustomizable: false
      },
      {
        id: 'beb-2',
        code: 'BEB-02',
        category: 'BEBIDAS',
        name: 'Caldo de Cana com Limão e Gelo 500ml',
        description: 'Cana fresca moída com limão taiti na hora.',
        basePriceCents: 900,
        isCustomizable: false
      },
      {
        id: 'beb-3',
        code: 'BEB-04',
        category: 'BEBIDAS',
        name: 'Coca-Cola Original Lata 350ml',
        description: 'Lata 350ml geladíssima.',
        basePriceCents: 650,
        isCustomizable: false
      }
    ]
  }
};

function createTenantVitrineStore() {
  const currentSlug = writable<string>('imperius-do-pastel');

  return {
    currentSlug,
    setSlug: (slug: string) => currentSlug.set(slug),
    getTenant: (slug: string): VitrineTenant => {
      return TENANT_DATABASE[slug] || TENANT_DATABASE['imperius-do-pastel'];
    }
  };
}

export const tenantVitrineManager = createTenantVitrineStore();
