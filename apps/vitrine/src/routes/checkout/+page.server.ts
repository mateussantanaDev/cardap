import type { PageServerLoad } from './$types';
import { QrTableToken } from '@cardap/core';
import { prisma } from '@cardap/database';

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token');
  const querySlug = url.searchParams.get('slug');
  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';

  let restaurant: any = null;
  try {
    const dbRestaurant = querySlug
      ? await prisma.restaurant.findUnique({ where: { slug: querySlug } })
      : await prisma.restaurant.findFirst();

    if (dbRestaurant) {
      restaurant = {
        name: dbRestaurant.name,
        slug: dbRestaurant.slug,
        phone: dbRestaurant.phone || '',
        category: dbRestaurant.category,
        deliveryFeeCents: Math.round(Number(dbRestaurant.deliveryFee || 0) * 100),
        minOrderCents: Math.round(Number(dbRestaurant.minOrderValue || 0) * 100),
        allowDelivery: dbRestaurant.allowDelivery ?? true,
        allowTakeout: dbRestaurant.allowTakeout ?? true,
        allowDineIn: dbRestaurant.allowDineIn ?? true,
        paymentGateway: dbRestaurant.paymentGateway || 'MERCADO_PAGO',
        pixKey: dbRestaurant.pixKey || '',
        pixKeyType: dbRestaurant.pixKeyType || 'CNPJ',
        pixReceiverName: dbRestaurant.pixReceiverName || '',
        pixReceiverCity: dbRestaurant.pixReceiverCity || '',
        pixInstructions: dbRestaurant.pixInstructions || '',
        primaryColor: dbRestaurant.primaryColor || '#dc2626',
        secondaryColor: dbRestaurant.secondaryColor || '#0f172a'
      };
    }
  } catch (err) {
    console.error('Erro ao carregar restaurante para checkout:', err);
  }

  if (!restaurant) {
    restaurant = {
      name: 'Imperius do Pastel',
      slug: 'imperius-do-pastel',
      phone: '',
      category: 'Pastelaria Artesanal & Caldos de Cana',
      deliveryFeeCents: 0,
      minOrderCents: 0,
      allowDelivery: true,
      allowTakeout: true,
      allowDineIn: true,
      paymentGateway: 'MERCADO_PAGO',
      pixKey: '',
      pixKeyType: 'CNPJ',
      pixReceiverName: '',
      pixReceiverCity: '',
      pixInstructions: '',
      primaryColor: '#dc2626',
      secondaryColor: '#0f172a'
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

  // Fluxo Padrão: Delivery ou Retirada
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
