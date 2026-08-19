import type { PageServerLoad } from './$types';
import { prisma, PrismaTableRepository } from '@cardap/database';
import { QrTableToken } from '@cardap/core';

const tableRepo = new PrismaTableRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let tables: any[] = [];
  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';

  try {
    const rawTables = await tableRepo.listAll();
    const vitrineBase = process.env.PUBLIC_VITRINE_URL || 'https://cardcap.vercel.app';
    tables = rawTables.map((t: any) => {
      const token = QrTableToken.generate(t.id, t.number, secretKey);
      return {
        id: t.id,
        number: t.number,
        seats: t.seats || 4,
        status: t.status,
        activeOrderNumber: t.activeOrderNumber ? `#${t.activeOrderNumber}` : null,
        activeOrderTotalCents: t.activeOrderTotalCents || 0,
        activeOrderTotalFormatted: `R$ ${((t.activeOrderTotalCents || 0) / 100).toFixed(2).replace('.', ',')}`,
        signedQrToken: token,
        qrUrl: `${vitrineBase}/mesa/${token}`
      };
    });
  } catch (err) {
    console.warn('Erro ao carregar mesas no SSR:', err);
  }

  return {
    tables
  };
};
