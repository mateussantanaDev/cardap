import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ url }) => {
  const period = url.searchParams.get('period') || 'MES';
  const customStart = url.searchParams.get('startDate');
  const customEnd = url.searchParams.get('endDate');

  try {
    let dateFilter: any = {};
    const now = new Date();

    if (period === 'HOJE') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      dateFilter = { createdAt: { gte: startOfDay } };
    } else if (period === 'SEMANA') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { gte: startOfWeek } };
    } else if (period === 'MES') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      dateFilter = { createdAt: { gte: startOfMonth } };
    } else if (customStart && customEnd) {
      dateFilter = {
        createdAt: {
          gte: new Date(customStart),
          lte: new Date(customEnd + 'T23:59:59')
        }
      };
    }

    const orders = await prisma.order.findMany({
      where: dateFilter,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true
          }
        },
        table: true,
        customer: true
      }
    });

    // Construção do CSV com ponto e vírgula e UTF-8 BOM
    const headers = [
      'Numero Pedido',
      'Data Hora',
      'Canal',
      'Status',
      'Cliente',
      'Telefone',
      'Forma Pagamento',
      'Status Pagamento',
      'Subtotal (R$)',
      'Taxa Entrega (R$)',
      'Desconto (R$)',
      'Total (R$)',
      'Itens do Pedido'
    ];

    const rows = orders.map(o => {
      const itemsStr = o.items
        .map(i => `${i.quantity}x ${i.product?.name || i.productName}`)
        .join(' | ')
        .replace(/"/g, '""');

      const channel = o.type === 'SALAO' ? `Mesa ${o.table?.number || '?'}` : o.type;
      const dateStr = o.createdAt.toLocaleDateString('pt-BR') + ' ' + o.createdAt.toLocaleTimeString('pt-BR');
      const customerName = (o.customer?.name || '').replace(/"/g, '""');
      const customerPhone = o.customer?.phone || '';

      return [
        `#${o.orderNumber}`,
        `"${dateStr}"`,
        `"${channel}"`,
        `"${o.status}"`,
        `"${customerName}"`,
        `"${customerPhone}"`,
        `"${o.paymentMethod || 'PIX'}"`,
        `"${o.paymentStatus || 'PENDENTE'}"`,
        Number(o.subtotal || 0).toFixed(2).replace('.', ','),
        Number(o.deliveryFee || 0).toFixed(2).replace('.', ','),
        Number(o.discountAmount || 0).toFixed(2).replace('.', ','),
        Number(o.totalAmount || 0).toFixed(2).replace('.', ','),
        `"${itemsStr}"`
      ].join(';');
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(';'), ...rows].join('\r\n');

    const fileName = `relatorio-vendas-cardap-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (err: any) {
    return new Response(`Erro ao gerar exportação CSV: ${err.message}`, { status: 500 });
  }
};
