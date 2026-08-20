import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const rawList = await prisma.customer.findMany({
      include: {
        tags: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            type: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            items: {
              select: {
                quantity: true,
                unitPrice: true,
                product: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const customers = rawList.map(c => {
      const totalOrdersCount = c.orders.length;
      const totalSpentCents = c.orders.reduce((acc, o) => acc + Math.round(Number(o.totalAmount) * 100), 0);
      const lastOrder = c.orders[0];

      // Formatar endereço completo
      const addrParts = [
        c.addressStreet,
        c.addressNumber ? `nº ${c.addressNumber}` : '',
        c.addressNeighborhood,
        c.addressComplement ? `(${c.addressComplement})` : '',
        c.addressCity
      ].filter(Boolean);
      const fullAddress = addrParts.length > 0 ? addrParts.join(', ') : 'Endereço não cadastrado';

      const fmt = (cents: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

      const tags = c.tags.map(t => t.name);
      if (totalSpentCents >= 20000 && !tags.includes('VIP')) tags.push('VIP');
      if (totalOrdersCount >= 3 && !tags.includes('RECORRENTE')) tags.push('RECORRENTE');
      if (totalOrdersCount <= 1 && !tags.includes('NOVO')) tags.push('NOVO');

      return {
        id: c.id,
        name: c.name || 'Cliente',
        phone: c.phone,
        formattedPhone: c.phone.length === 11
          ? `(${c.phone.slice(0, 2)}) ${c.phone.slice(2, 7)}-${c.phone.slice(7)}`
          : (c.phone.length === 13 && c.phone.startsWith('55')
            ? `(${c.phone.slice(2, 4)}) ${c.phone.slice(4, 9)}-${c.phone.slice(9)}`
            : c.phone),
        address: fullAddress,
        addressStreet: c.addressStreet || '',
        addressNumber: c.addressNumber || '',
        addressNeighborhood: c.addressNeighborhood || '',
        addressComplement: c.addressComplement || '',
        totalOrdersCount,
        totalSpentCents,
        totalSpentFormatted: fmt(totalSpentCents),
        lastOrderDateFormatted: lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString('pt-BR') : 'Sem pedidos',
        tags,
        orders: c.orders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          type: o.type,
          status: o.status,
          totalFormatted: fmt(Math.round(Number(o.totalAmount) * 100)),
          createdAtFormatted: new Date(o.createdAt).toLocaleString('pt-BR'),
          itemsSummary: o.items.map(it => `${it.quantity}x ${it.product?.name || 'Item'}`).join(', ')
        }))
      };
    });

    return json({
      success: true,
      customers,
      totalCount: customers.length,
      vipCount: customers.filter(c => c.tags.includes('VIP')).length
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao listar clientes do CRM: ${err.message}` }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, addressStreet, addressNumber, addressNeighborhood, addressComplement, tags } = body;

    if (!name || !phone) {
      return json({ success: false, error: 'Nome e telefone são obrigatórios.' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const customer = await prisma.customer.upsert({
      where: { phone: cleanPhone },
      create: {
        name,
        phone: cleanPhone,
        addressStreet,
        addressNumber,
        addressNeighborhood,
        addressComplement
      },
      update: {
        name,
        addressStreet,
        addressNumber,
        addressNeighborhood,
        addressComplement
      }
    });

    if (Array.isArray(tags)) {
      for (const tag of tags) {
        await prisma.customerTag.upsert({
          where: {
            customerId_name: {
              customerId: customer.id,
              name: tag
            }
          },
          create: {
            customerId: customer.id,
            name: tag
          },
          update: {}
        });
      }
    }

    return json({
      success: true,
      customer
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao salvar cliente: ${err.message}` }, { status: 500 });
  }
};
