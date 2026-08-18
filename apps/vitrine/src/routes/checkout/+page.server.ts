import type { PageServerLoad } from './$types';
import { QrTableToken } from '@cardap/core';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token');
  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';

  let restaurant = null;
  try {
    const dbRestaurant = await prisma.restaurant.findFirst();
    if (dbRestaurant) {
      restaurant = {
        name: dbRestaurant.name,
        slug: dbRestaurant.slug,
        phone: dbRestaurant.phone,
        deliveryFeeCents: Math.round(Number(dbRestaurant.deliveryFee) * 100) || 600
      };
    }
  } catch (err) {
    // Fallback se banco indisponível
  }

  if (!restaurant) {
    restaurant = {
      name: 'Imperius do Pastel',
      slug: 'imperius-do-pastel',
      phone: '(87) 99812-3456',
      deliveryFeeCents: 600
    };
  }

  if (token) {
    try {
      const verifiedToken = QrTableToken.parseAndVerify(token, secretKey);
      return {
        restaurant,
        isTableFlow: true,
        tableId: verifiedToken.getTableId(),
        tableNumber: verifiedToken.getTableNumber(),
        rawToken: token,
        tokenError: null
      };
    } catch (err: any) {
      return {
        restaurant,
        isTableFlow: false,
        tableId: null,
        tableNumber: null,
        rawToken: null,
        tokenError: `Assinatura da mesa inválida: ${err.message}`
      };
    }
  }

  // Fluxo Padrão: Delivery em Domicílio
  return {
    restaurant,
    isTableFlow: false,
    tableId: null,
    tableNumber: null,
    rawToken: null,
    deliveryFeeCents: restaurant.deliveryFeeCents,
    tokenError: null
  };
};
