import type { PageServerLoad } from './$types';
import { QrTableToken } from '@cardap/core';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ params }) => {
  const token = params.token;
  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';

  let restaurant: any = null;
  try {
    const dbRest = await prisma.restaurant.findFirst();
    if (dbRest) {
      restaurant = {
        name: dbRest.name,
        slug: dbRest.slug,
        primaryColor: dbRest.primaryColor || '#dc2626',
        secondaryColor: dbRest.secondaryColor || '#0f172a'
      };
    }
  } catch (e) {}

  if (!restaurant) {
    restaurant = {
      name: 'Imperius do Pastel',
      slug: 'imperius-do-pastel',
      primaryColor: '#dc2626',
      secondaryColor: '#0f172a'
    };
  }

  try {
    const verifiedToken = QrTableToken.parseAndVerify(token, secretKey);
    const tableId = verifiedToken.getTableId();
    const tableNumber = verifiedToken.getTableNumber();

    return {
      isValid: true,
      token,
      tableId,
      tableNumber,
      restaurant,
      errorMessage: null
    };
  } catch (err: any) {
    return {
      isValid: false,
      token,
      tableId: null,
      tableNumber: null,
      restaurant,
      errorMessage: `QR Code inválido ou expirado: ${err.message}`
    };
  }
};
