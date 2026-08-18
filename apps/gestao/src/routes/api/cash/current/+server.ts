import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaCashShiftRepository } from '@cardap/database';

const cashRepo = new PrismaCashShiftRepository();

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const activeShift = await cashRepo.findCurrentOpenShift();

    if (!activeShift) {
      return json({
        success: true,
        isOpen: false,
        shift: null
      });
    }

    const currentDrawerBalance = activeShift.calculateCurrentCashInDrawer();

    return json({
      success: true,
      isOpen: true,
      shift: {
        id: activeShift.id,
        openedByUserId: activeShift.openedByUserId,
        openedAt: activeShift.openedAt,
        status: activeShift.status,
        initialAmountCents: activeShift.initialAmount.getCents(),
        initialAmountFormatted: activeShift.initialAmount.formatBRL(),
        currentDrawerBalanceCents: currentDrawerBalance.getCents(),
        currentDrawerBalanceFormatted: currentDrawerBalance.formatBRL(),
        notes: activeShift.notes,
        transactions: activeShift.transactions.map(tx => ({
          id: tx.id,
          userId: tx.userId,
          orderId: tx.orderId,
          type: tx.type,
          amountCents: tx.amount.getCents(),
          amountFormatted: tx.amount.formatBRL(),
          description: tx.description,
          createdAt: tx.createdAt
        }))
      }
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao buscar turno de caixa ativo: ${err.message}` }, { status: 500 });
  }
};
