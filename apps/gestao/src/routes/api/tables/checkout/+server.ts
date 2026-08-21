import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { tableId, tableNumber, paymentMethod, items, totalCents, discountCents } = await request.json();

    if (!tableId && !tableNumber) {
      return json({ success: false, error: 'Mesa não informada.' }, { status: 400 });
    }

    // 1. Localizar a mesa
    const table = tableId
      ? await prisma.table.findUnique({ where: { id: tableId } })
      : await prisma.table.findUnique({ where: { number: Number(tableNumber) } });

    if (!table) {
      return json({ success: false, error: 'Mesa não encontrada.' }, { status: 404 });
    }

    // 2. Finalizar todos os pedidos abertos vinculados à mesa
    await prisma.order.updateMany({
      where: {
        tableId: table.id,
        status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
      },
      data: {
        status: 'ENTREGUE',
        paymentStatus: 'PAGO',
        paymentMethod: paymentMethod || 'DINHEIRO'
      }
    });

    // 3. Resetar status da mesa para LIVRE
    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: {
        status: 'LIVRE',
        activeOrderTotal: 0.00
      }
    });

    // 4. Registrar transação de caixa no turno aberto se existir
    const activeShift = await prisma.cashShift.findFirst({
      where: { status: 'ABERTO' },
      orderBy: { openedAt: 'desc' }
    });

    if (activeShift && totalCents > 0) {
      await prisma.cashTransaction.create({
        data: {
          shiftId: activeShift.id,
          userId: locals.user.id,
          type: 'SUPRIMENTO',
          amount: Number(totalCents) / 100,
          description: `Fechamento de Conta — Mesa ${table.number} (${paymentMethod || 'DINHEIRO'})`
        }
      });
    }

    return json({
      success: true,
      message: `Mesa ${table.number} finalizada e liberada com sucesso!`,
      table: updatedTable
    });
  } catch (err: any) {
    console.error('Erro ao fechar mesa no PDV:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
