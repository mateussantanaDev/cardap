import { json, type RequestHandler } from '@sveltejs/kit';
import { CalculateDeliveryFeeUseCase } from '@cardap/core';
import { PrismaDeliveryZoneRepository } from '@cardap/database';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { distanceKm, zipCode, neighborhood, subtotalCents } = body;

    let zoneRepo;
    try {
      zoneRepo = new PrismaDeliveryZoneRepository();
    } catch {
      zoneRepo = {
        findActiveZones: async () => [
          { id: 'z1', name: 'Zona Centro (Até 3km)', maxDistanceKm: 3.0, deliveryFeeCents: 600, estimatedSlaMinutes: 30, isActive: true },
          { id: 'z2', name: 'Zona Expandida (Até 7km)', maxDistanceKm: 7.0, deliveryFeeCents: 1000, estimatedSlaMinutes: 45, isActive: true }
        ],
        findByDistance: async (d: number) => null
      };
    }

    const useCase = new CalculateDeliveryFeeUseCase(zoneRepo);
    const result = await useCase.execute({
      distanceKm: distanceKm ? Number(distanceKm) : undefined,
      zipCode,
      neighborhood,
      subtotalCents: subtotalCents ? Number(subtotalCents) : undefined
    });

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    return json({
      success: true,
      data: result.getValue()
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao calcular frete: ${err.message}` }, { status: 500 });
  }
};
