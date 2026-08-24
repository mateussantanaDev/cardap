import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaCashShiftRepository, prisma } from '@cardap/database';

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

    // 1. Buscar todos os pedidos lançados no turno aberto (por shiftId ou criados a partir de openedAt)
    const shiftOrders = await prisma.order.findMany({
      where: {
        OR: [
          { shiftId: activeShift.id },
          { createdAt: { gte: activeShift.openedAt } }
        ],
        status: { not: 'CANCELADO' }
      },
      select: {
        id: true,
        orderNumber: true,
        paymentMethod: true,
        paymentStatus: true,
        totalAmount: true,
        status: true
      }
    });

    let totalCashSalesCents = 0;
    let totalCardSalesCents = 0;
    let totalPixSalesCents = 0;

    for (const ord of shiftOrders) {
      const amountCents = Math.round(Number(ord.totalAmount) * 100);
      if (ord.paymentMethod === 'DINHEIRO') {
        totalCashSalesCents += amountCents;
      } else if (ord.paymentMethod === 'PIX') {
        totalPixSalesCents += amountCents;
      } else {
        totalCardSalesCents += amountCents;
      }
    }

    const totalSalesCents = totalCashSalesCents + totalCardSalesCents + totalPixSalesCents;
    const cashPercentStr = totalSalesCents > 0 ? `+${Math.round((totalCashSalesCents / totalSalesCents) * 100)}%` : '0%';

    // 2. Calcular Sangrias e Suprimentos
    let totalSangriasCents = 0;
    let totalSuprimentosCents = 0;

    for (const tx of activeShift.transactions) {
      if (tx.type === 'SANGRIA') {
        totalSangriasCents += tx.amount.getCents();
      } else if (tx.type === 'SUPRIMENTO') {
        totalSuprimentosCents += tx.amount.getCents();
      }
    }

    const initialAmountCents = activeShift.initialAmount.getCents();
    const expectedDrawerCashCents = initialAmountCents + totalCashSalesCents + totalSuprimentosCents - totalSangriasCents;

    const fmt = (cents: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

    return json({
      success: true,
      isOpen: true,
      shift: {
        id: activeShift.id,
        openedByUserId: activeShift.openedByUserId,
        openedAt: activeShift.openedAt,
        status: activeShift.status,
        initialAmountCents,
        initialAmountFormatted: fmt(initialAmountCents),
        totalCashSalesCents,
        totalCashSalesFormatted: fmt(totalCashSalesCents),
        totalCardSalesCents,
        totalCardSalesFormatted: fmt(totalCardSalesCents),
        totalPixSalesCents,
        totalPixSalesFormatted: fmt(totalPixSalesCents),
        totalSalesCents,
        totalSalesFormatted: fmt(totalSalesCents),
        cashSalesPercent: cashPercentStr,
        totalSangriasCents,
        totalSangriasFormatted: fmt(totalSangriasCents),
        totalSuprimentosCents,
        totalSuprimentosFormatted: fmt(totalSuprimentosCents),
        currentDrawerBalanceCents: expectedDrawerCashCents,
        currentDrawerBalanceFormatted: fmt(expectedDrawerCashCents),
        orderCount: shiftOrders.length,
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
