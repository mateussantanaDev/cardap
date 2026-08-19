import type { PageServerLoad } from './$types';
import { prisma, PrismaCashShiftRepository } from '@cardap/database';

const cashRepo = new PrismaCashShiftRepository();

export const load: PageServerLoad = async ({ locals }) => {
  let activeShift: any = null;
  let transactions: any[] = [];

  try {
    const shift = await cashRepo.findCurrentOpenShift();
    if (shift) {
      activeShift = {
        id: shift.id,
        openedByUserId: shift.openedByUserId,
        openedAt: shift.openedAt.toISOString(),
        initialAmountCents: shift.initialAmountCents,
        initialAmountFormatted: `R$ ${(shift.initialAmountCents / 100).toFixed(2).replace('.', ',')}`,
        currentDrawerBalanceCents: shift.currentDrawerBalanceCents,
        currentDrawerBalanceFormatted: `R$ ${(shift.currentDrawerBalanceCents / 100).toFixed(2).replace('.', ',')}`,
        status: shift.status
      };

      const dbTx = await prisma.cashMovement.findMany({
        where: { cashShiftId: shift.id },
        orderBy: { createdAt: 'desc' }
      });

      transactions = dbTx.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amountCents: tx.amountCents,
        amountFormatted: `${tx.type === 'SANGRIA' ? '- ' : '+ '}R$ ${(tx.amountCents / 100).toFixed(2).replace('.', ',')}`,
        description: tx.description || tx.reason || '',
        createdAt: tx.createdAt.toISOString(),
        isPositive: tx.type !== 'SANGRIA'
      }));
    }
  } catch (err) {
    console.warn('Erro ao carregar turno de caixa no SSR:', err);
  }

  return {
    activeShift,
    transactions
  };
};
