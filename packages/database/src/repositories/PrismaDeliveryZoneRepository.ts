import { IDeliveryZoneRepository, DeliveryZoneData } from '@cardap/core';
import { prisma } from '../client.js';

export class PrismaDeliveryZoneRepository implements IDeliveryZoneRepository {
  async findActiveZones(): Promise<DeliveryZoneData[]> {
    const rawZones = await prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { maxDistanceKm: 'asc' }
    });

    return rawZones.map(z => ({
      id: z.id,
      name: z.name,
      polygonGeoJson: z.polygonGeoJson || undefined,
      maxDistanceKm: Number(z.maxDistanceKm),
      deliveryFeeCents: Math.round(Number(z.deliveryFee) * 100),
      estimatedSlaMinutes: z.estimatedSlaMinutes,
      isActive: z.isActive
    }));
  }

  async findByDistance(distanceKm: number): Promise<DeliveryZoneData | null> {
    const zones = await this.findActiveZones();
    return zones.find(z => distanceKm <= z.maxDistanceKm) || null;
  }
}
