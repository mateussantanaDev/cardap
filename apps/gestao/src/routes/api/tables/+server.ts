import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { QrTableToken } from '@cardap/core';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';
  const vitrineBase = process.env.PUBLIC_VITRINE_URL || 'https://usecardap.com.br';

  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: {
            status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
          },
          include: {
            items: {
              include: {
                product: {
                  select: { name: true, price: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const formattedTables = tables.map(t => {
      // Calcular total e contagem de pedidos ativos
      const activeTotal = t.orders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
      const activeOrdersCount = t.orders.length;

      // Agrupar itens reais da comanda
      const realItems: Array<{ name: string; qty: number; priceFormatted: string; notes?: string }> = [];
      for (const order of t.orders) {
        for (const it of order.items) {
          realItems.push({
            name: it.product?.name || 'Item do Pedido',
            qty: it.quantity,
            priceFormatted: `R$ ${(Number(it.unitPrice) * it.quantity).toFixed(2).replace('.', ',')}`,
            notes: it.notes || undefined
          });
        }
      }

      // Gerar Token Criptográfico Seguro (HMAC-SHA256)
      const tokenObj = QrTableToken.create(t.id, t.number, secretKey);
      const rawToken = tokenObj.getRawToken();
      const qrUrl = `${vitrineBase}/mesa/${rawToken}`;

      let currentStatus = t.status;
      if (activeOrdersCount > 0 && currentStatus === 'LIVRE') {
        currentStatus = 'OCUPADA';
      }

      return {
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        status: currentStatus,
        activeOrdersCount,
        activeOrderTotalFormatted: `R$ ${activeTotal.toFixed(2).replace('.', ',')}`,
        activeOrderTotalCents: Math.round(activeTotal * 100),
        signedQrToken: rawToken,
        qrCodeUrl: qrUrl,
        items: realItems,
        orders: t.orders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: Number(o.totalAmount),
          totalAmountFormatted: `R$ ${Number(o.totalAmount).toFixed(2).replace('.', ',')}`,
          createdAt: o.createdAt
        }))
      };
    });

    return json({
      success: true,
      tables: formattedTables
    });
  } catch (err: any) {
    console.error('Erro ao buscar mesas:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { number, capacity } = await request.json();
    const tableNum = Number(number);
    const tableCap = Number(capacity) || 4;

    if (!tableNum || tableNum <= 0) {
      return json({ success: false, error: 'Número da mesa inválido.' }, { status: 400 });
    }

    const existing = await prisma.table.findUnique({ where: { number: tableNum } });
    if (existing) {
      return json({ success: false, error: `A Mesa ${tableNum} já está cadastrada no salão.` }, { status: 400 });
    }

    const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';
    const tempId = `tbl-${Date.now()}`;
    const tokenObj = QrTableToken.create(tempId, tableNum, secretKey);
    const rawToken = tokenObj.getRawToken();
    const vitrineBase = process.env.PUBLIC_VITRINE_URL || 'https://usecardap.com.br';

    const created = await prisma.table.create({
      data: {
        number: tableNum,
        capacity: tableCap,
        qrTokenSignature: rawToken,
        qrCodeUrl: `${vitrineBase}/mesa/${rawToken}`,
        status: 'LIVRE',
        activeOrderTotal: 0.00
      }
    });

    // Atualizar token com o ID real persistido
    const realTokenObj = QrTableToken.create(created.id, tableNum, secretKey);
    const realRawToken = realTokenObj.getRawToken();
    const updated = await prisma.table.update({
      where: { id: created.id },
      data: {
        qrTokenSignature: realRawToken,
        qrCodeUrl: `${vitrineBase}/mesa/${realRawToken}`
      }
    });

    return json({
      success: true,
      table: {
        id: updated.id,
        number: updated.number,
        capacity: updated.capacity,
        status: updated.status,
        activeOrdersCount: 0,
        activeOrderTotalFormatted: 'R$ 0,00',
        activeOrderTotalCents: 0,
        signedQrToken: realRawToken,
        qrCodeUrl: `${vitrineBase}/mesa/${realRawToken}`,
        items: []
      }
    });
  } catch (err: any) {
    console.error('Erro ao cadastrar mesa:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { id, status, capacity } = await request.json();

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (capacity) dataToUpdate.capacity = Number(capacity);

    const updated = await prisma.table.update({
      where: { id },
      data: dataToUpdate
    });

    return json({ success: true, table: updated });
  } catch (err: any) {
    console.error('Erro ao atualizar mesa:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ success: false, error: 'ID da mesa não fornecido.' }, { status: 400 });
  }

  try {
    // Verificar se tem pedidos em andamento
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId: id,
        status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
      }
    });

    if (activeOrders.length > 0) {
      return json({ success: false, error: 'Não é possível excluir uma mesa com comanda aberta em andamento.' }, { status: 400 });
    }

    await prisma.table.delete({ where: { id } });
    return json({ success: true, message: 'Mesa excluída com sucesso.' });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
