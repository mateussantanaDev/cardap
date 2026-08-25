import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { getServerOrderById, updateServerOrderStatus } from '$lib/server/ordersStore';

export const GET: RequestHandler = async ({ params }) => {
  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  // 1. Tentar consultar via Prisma / PostgreSQL com itens e relações completas
  try {
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        table: true,
        items: {
          include: {
            product: { select: { name: true } },
            assemblies: true,
            modifiers: true,
            complements: true
          }
        }
      }
    });

    if (dbOrder) {
      const subtotalCents = Math.round(Number(dbOrder.subtotal || 0) * 100);
      const deliveryFeeCents = Math.round(Number(dbOrder.deliveryFee || 0) * 100);
      const discountCents = Math.round(Number(dbOrder.discountAmount || 0) * 100);
      const totalCents = Math.round(Number(dbOrder.totalAmount || 0) * 100);

      return json({
        success: true,
        source: 'database',
        order: {
          id: dbOrder.id,
          orderNumber: dbOrder.orderNumber,
          status: dbOrder.status,
          type: dbOrder.type,
          paymentMethod: dbOrder.paymentMethod,
          paymentStatus: dbOrder.paymentStatus,
          customerName: dbOrder.customer?.name || (dbOrder.type === 'SALAO' ? `Mesa ${dbOrder.table?.number || ''}` : 'Cliente'),
          customerPhone: dbOrder.customer?.phone || '',
          customerCpf: dbOrder.customer?.cpf || '',
          deliveryAddress: dbOrder.customer ? {
            street: dbOrder.customer.addressStreet,
            number: dbOrder.customer.addressNumber,
            complement: dbOrder.customer.addressComplement,
            neighborhood: dbOrder.customer.addressNeighborhood,
            city: dbOrder.customer.addressCity,
            state: dbOrder.customer.addressState,
            zipCode: dbOrder.customer.addressZipCode
          } : undefined,
          tableNumber: dbOrder.table?.number || undefined,
          subtotalCents,
          deliveryFeeCents,
          discountCents,
          totalCents,
          notes: dbOrder.notes,
          createdAt: dbOrder.createdAt.toISOString(),
          items: dbOrder.items.map(it => {
            const unitCents = Math.round(Number(it.unitPrice || 0) * 100);
            const totalItemCents = Math.round(Number(it.totalPrice || (Number(it.unitPrice || 0) * it.quantity)) * 100);
            return {
              name: it.product?.name || 'Item do Pedido',
              quantity: it.quantity,
              unitPriceCents: unitCents,
              totalPriceCents: totalItemCents,
              notes: it.notes,
              assemblies: (it.assemblies || []).map(a => a.name),
              modifiers: (it.modifiers || []).map(m => m.name),
              complements: (it.complements || []).map(c => c.name)
            };
          })
        }
      });
    }
  } catch (err) {
    console.warn('Fallback consulta banco de dados status:', err);
  }

  // 2. Fallback para a memória do servidor
  const order = getServerOrderById(orderId);

  if (!order) {
    return json({
      success: true,
      source: 'virtual-fallback',
      order: {
        id: orderId,
        orderNumber: 101,
        type: 'DELIVERY',
        status: 'RECEBIDO',
        customerName: 'Cliente',
        subtotalCents: 0,
        deliveryFeeCents: 0,
        totalCents: 0,
        items: [],
        createdAt: new Date().toISOString()
      }
    });
  }

  return json({
    success: true,
    source: 'memory',
    order: getServerOrderById(orderId)
  });
};
