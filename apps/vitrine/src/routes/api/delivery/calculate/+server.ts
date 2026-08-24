import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { distanceKm } = body;

    // 1. Buscar zonas de entrega cadastradas no PostgreSQL
    const activeZones = await prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { maxDistanceKm: 'asc' }
    });

    const dist = distanceKm !== undefined && distanceKm !== null ? Number(distanceKm) : 0;

    let matchedZone = activeZones.find(z => dist <= Number(z.maxDistanceKm));
    if (!matchedZone && activeZones.length > 0) {
      matchedZone = activeZones[activeZones.length - 1];
    }

    if (matchedZone) {
      const feeCents = Math.round(Number(matchedZone.deliveryFee) * 100);
      return json({
        success: true,
        data: {
          deliveryFeeCents: feeCents,
          deliveryFeeFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(feeCents / 100),
          estimatedSlaMinutes: matchedZone.estimatedSlaMinutes,
          zoneName: matchedZone.name,
          isFree: feeCents === 0
        }
      });
    }

    // 2. Se não houver delivery_zones cadastradas, busca o valor configurado na tabela de restaurantes
    const dbRestaurant = await prisma.restaurant.findFirst({
      select: {
        deliveryFee: true,
        slaMinutesMin: true,
        slaMinutesMax: true
      }
    });

    const feeCents = dbRestaurant ? Math.round(Number(dbRestaurant.deliveryFee || 0) * 100) : 0;
    const slaMax = dbRestaurant ? dbRestaurant.slaMinutesMax : 30;

    return json({
      success: true,
      data: {
        deliveryFeeCents: feeCents,
        deliveryFeeFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(feeCents / 100),
        estimatedSlaMinutes: slaMax,
        zoneName: 'Taxa da Loja',
        isFree: feeCents === 0
      }
    });
  } catch (err: any) {
    console.error('Erro ao calcular taxa de entrega:', err);
    return json({ success: false, error: `Erro ao calcular frete: ${err.message}` }, { status: 500 });
  }
};
