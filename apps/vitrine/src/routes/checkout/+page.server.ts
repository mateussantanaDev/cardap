import type { PageServerLoad } from './$types';
import { QrTableToken } from '@cardap/core';

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token');
  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';

  if (token) {
    try {
      const verifiedToken = QrTableToken.parseAndVerify(token, secretKey);
      return {
        isTableFlow: true,
        tableId: verifiedToken.getTableId(),
        tableNumber: verifiedToken.getTableNumber(),
        rawToken: token,
        tokenError: null
      };
    } catch (err: any) {
      return {
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
    isTableFlow: false,
    tableId: null,
    tableNumber: null,
    rawToken: null,
    deliveryFeeCents: 850, // R$ 8,50 taxa de entrega padrão
    tokenError: null
  };
};
