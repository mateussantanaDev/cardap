import { Result } from '../../shared/Result';
import { DomainError, InvalidCatalogError } from '../../shared/DomainError';

export interface DeliveryZoneData {
  id: string;
  name: string;
  polygonGeoJson?: string;
  maxDistanceKm: number;
  deliveryFeeCents: number;
  estimatedSlaMinutes: number;
  isActive: boolean;
}

export interface IDeliveryZoneRepository {
  findActiveZones(): Promise<DeliveryZoneData[]>;
  findByDistance(distanceKm: number): Promise<DeliveryZoneData | null>;
}

export interface CalculateDeliveryFeeInputDTO {
  distanceKm?: number;
  zipCode?: string;
  neighborhood?: string;
  subtotalCents?: number;
}

export interface CalculateDeliveryFeeOutputDTO {
  zoneId?: string;
  zoneName: string;
  deliveryFeeCents: number;
  feeCents: number;
  feeFormatted: string;
  estimatedSlaMinutes: number;
  isFreeDelivery: boolean;
}

export class CalculateDeliveryFeeUseCase {
  constructor(private zoneRepo: IDeliveryZoneRepository) {}

  async execute(request: CalculateDeliveryFeeInputDTO): Promise<Result<CalculateDeliveryFeeOutputDTO, DomainError>> {
    const zones = await this.zoneRepo.findActiveZones();

    if (zones.length === 0) {
      // Regra Padrão Fallback se nenhuma zona cadastrada
      return Result.ok({
        zoneName: 'Entrega Padrão',
        deliveryFeeCents: 850,
        feeCents: 850,
        feeFormatted: 'R$ 8,50',
        estimatedSlaMinutes: 40,
        isFreeDelivery: false
      });
    }

    const distance = request.distanceKm || 2.5; // Distância padrão em km se não informada
    const matchedZone = zones
      .filter(z => distance <= z.maxDistanceKm)
      .sort((a, b) => a.maxDistanceKm - b.maxDistanceKm)[0] || zones[zones.length - 1];

    // Frete Grátis para pedidos acima de R$ 100,00 ou quando a taxa da zona for 0
    const isFreeDelivery = !!(request.subtotalCents && request.subtotalCents >= 10000) || matchedZone.deliveryFeeCents === 0;
    const feeCents = isFreeDelivery ? 0 : matchedZone.deliveryFeeCents;
    const feeFormatted = feeCents === 0 ? 'Grátis' : `R$ ${(feeCents / 100).toFixed(2).replace('.', ',')}`;

    return Result.ok({
      zoneId: matchedZone.id,
      zoneName: matchedZone.name,
      deliveryFeeCents: feeCents,
      feeCents,
      feeFormatted,
      estimatedSlaMinutes: matchedZone.estimatedSlaMinutes,
      isFreeDelivery
    });
  }
}
