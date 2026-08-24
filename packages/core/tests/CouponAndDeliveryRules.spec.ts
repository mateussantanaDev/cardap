import { describe, it, expect } from 'vitest';
import { ValidateCouponUseCase, ICouponRepository, CouponData } from '../src/use-cases/coupon/ValidateCouponUseCase';
import { CalculateDeliveryFeeUseCase, IDeliveryZoneRepository, DeliveryZoneData } from '../src/use-cases/delivery/CalculateDeliveryFeeUseCase';

class MockCouponRepository implements ICouponRepository {
  private coupons: CouponData[] = [];

  constructor(initialCoupons: CouponData[] = []) {
    this.coupons = initialCoupons;
  }

  async findByCode(code: string): Promise<CouponData | null> {
    return this.coupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
  }

  async incrementUsage(id: string): Promise<void> {
    const coupon = this.coupons.find(c => c.id === id);
    if (coupon) coupon.currentUsages += 1;
  }
}

class MockDeliveryZoneRepository implements IDeliveryZoneRepository {
  private zones: DeliveryZoneData[] = [];

  constructor(zones: DeliveryZoneData[] = []) {
    this.zones = zones;
  }

  async findActiveZones(): Promise<DeliveryZoneData[]> {
    return this.zones.filter(z => z.isActive);
  }

  async findByDistance(distanceKm: number): Promise<DeliveryZoneData | null> {
    return this.zones.find(z => z.isActive && distanceKm <= z.maxDistanceKm) || null;
  }
}

describe('Etapa 2: Validação de Cupons Promocionais e Frete Grátis', () => {
  const sampleCoupons: CouponData[] = [
    {
      id: 'c-10off',
      code: 'BURGUER10',
      description: '10% de desconto',
      discountType: 'PERCENTUAL',
      discountValue: 10,
      minOrderValueCents: 3000, // R$ 30,00
      maxDiscountValueCents: 1500, // Max R$ 15,00
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      currentUsages: 0
    },
    {
      id: 'c-fixo-15',
      code: 'PROMO15',
      description: 'R$ 15,00 de desconto',
      discountType: 'VALOR_FIXO',
      discountValue: 15, // R$ 15,00
      minOrderValueCents: 5000, // R$ 50,00
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      currentUsages: 0
    }
  ];

  it('deve aplicar cupom percentual com sucesso e respeitar valor mínimo', async () => {
    const repo = new MockCouponRepository(sampleCoupons);
    const useCase = new ValidateCouponUseCase(repo);

    // Pedido abaixo do mínimo (R$ 25,00 < R$ 30,00)
    const belowMinResult = await useCase.execute({
      code: 'burguer10',
      subtotalCents: 2500
    });
    expect(belowMinResult.isFailure).toBe(true);
    expect(belowMinResult.getError().message).toContain('requer valor mínimo');

    // Pedido válido (R$ 50,00 -> 10% = R$ 5,00 de desconto)
    const validResult = await useCase.execute({
      code: 'BURGUER10',
      subtotalCents: 5000
    });
    expect(validResult.isSuccess).toBe(true);
    const data = validResult.getValue();
    expect(data.discountCents).toBe(500); // R$ 5,00
    expect(data.finalTotalCents).toBe(4500); // R$ 45,00
  });

  it('deve aplicar cupom de valor fixo corretamente', async () => {
    const repo = new MockCouponRepository(sampleCoupons);
    const useCase = new ValidateCouponUseCase(repo);

    const result = await useCase.execute({
      code: 'promo15',
      subtotalCents: 6000 // R$ 60,00
    });

    expect(result.isSuccess).toBe(true);
    const data = result.getValue();
    expect(data.discountCents).toBe(1500); // R$ 15,00
    expect(data.finalTotalCents).toBe(4500); // R$ 45,00
  });

  it('deve respeitar taxa de entrega grátis (0 centavos) quando configurado na loja', async () => {
    // Zona gratuita (R$ 0,00 de frete)
    const freeDeliveryZones: DeliveryZoneData[] = [
      {
        id: 'z-free',
        name: 'Entrega Grátis Local',
        maxDistanceKm: 5.0,
        deliveryFeeCents: 0,
        estimatedSlaMinutes: 30,
        isActive: true
      }
    ];

    const zoneRepo = new MockDeliveryZoneRepository(freeDeliveryZones);
    const useCase = new CalculateDeliveryFeeUseCase(zoneRepo);

    const result = await useCase.execute({
      distanceKm: 3.2,
      subtotalCents: 4000
    });

    expect(result.isSuccess).toBe(true);
    const feeData = result.getValue();
    expect(feeData.feeCents).toBe(0);
    expect(feeData.isFreeDelivery).toBe(true);
    expect(feeData.feeFormatted).toBe('Grátis');
  });
});
