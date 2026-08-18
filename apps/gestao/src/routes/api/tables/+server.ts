import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async () => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: {
            status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
          },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true
          }
        }
      }
    });

    const formattedTables = tables.map(t => {
      const activeTotal = t.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
      return {
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        status: t.orders.length > 0 ? 'OCUPADA' : t.status,
        activeOrderTotal: activeTotal,
        qrTokenSignature: t.qrTokenSignature,
        qrCodeUrl: t.qrCodeUrl
      };
    });

    return json({
      success: true,
      tables: formattedTables
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { id, status } = await request.json();
    const updated = await prisma.table.update({
      where: { id },
      data: { status }
    });
    return json({ success: true, table: updated });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
