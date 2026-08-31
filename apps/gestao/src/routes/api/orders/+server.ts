import { json, type RequestHandler } from '@sveltejs/kit';
import { CreateOrderUseCase, CreateOrderSchema, SecurityGuard } from '@cardap/core';
import { PrismaOrderRepository, PrismaTableRepository, PrismaCashShiftRepository, prisma } from '@cardap/database';

const orderRepo = new PrismaOrderRepository();
const tableRepo = new PrismaTableRepository();
const cashRepo = new PrismaCashShiftRepository();
const createOrderUseCase = new CreateOrderUseCase(orderRepo, tableRepo);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  const authCheck = SecurityGuard.authorize(locals.user.role, 'CREATE_ORDER');
  if (authCheck.isFailure) {
    return json({ success: false, error: authCheck.getError().message }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Se shiftId não for passado, tenta vincular automaticamente ao caixa ABERTO
    let targetShiftId = body.shiftId;
    if (!targetShiftId) {
      const activeShift = await cashRepo.findCurrentOpenShift();
      if (activeShift) {
        targetShiftId = activeShift.id;
      } else {
        let lastShift = await prisma.cashShift.findFirst({ orderBy: { openedAt: 'desc' } });
        if (!lastShift) {
          const firstUser = await prisma.user.findFirst();
          const firstRest = await prisma.restaurant.findFirst();
          if (firstUser && firstRest) {
            lastShift = await prisma.cashShift.create({
              data: {
                restaurantId: firstRest.id,
                openedById: firstUser.id,
                initialAmount: 0,
                status: 'ABERTO',
                openedAt: new Date()
              }
            });
          }
        }
        targetShiftId = lastShift?.id;
      }
    }

    // Validar e garantir que cada item possua um productId válido no banco
    const defaultProduct = await prisma.product.findFirst({ where: { isActive: true } });
    const processedItems = await Promise.all((body.items || []).map(async (item: any) => {
      let finalProductId = item.productId;
      if (finalProductId) {
        const prodExists = await prisma.product.findUnique({ where: { id: finalProductId } });
        if (!prodExists && defaultProduct) {
          finalProductId = defaultProduct.id;
        }
      } else if (defaultProduct) {
        finalProductId = defaultProduct.id;
      }
      return {
        ...item,
        productId: finalProductId
      };
    }));

    // Validação estrita Zod
    const validation = CreateOrderSchema.safeParse({
      ...body,
      shiftId: targetShiftId,
      items: processedItems
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return json(
        { success: false, error: `Dados inválidos do pedido: ${firstIssue.path.join('.')} - ${firstIssue.message}` },
        { status: 400 }
      );
    }

    const result = await createOrderUseCase.execute(validation.data);

    if (result.isFailure) {
      return json({ success: false, error: result.getError().message }, { status: 400 });
    }

    const createdOrder = result.getValue();

    // Notifica fila de impressão em tempo real (Cardap Print Agent)
    try {
      let targetRestaurantId = locals.user.restaurantId || body.restaurantId;
      if (!targetRestaurantId && targetShiftId) {
        const shiftDb = await prisma.cashShift.findUnique({ where: { id: targetShiftId } });
        targetRestaurantId = shiftDb?.restaurantId;
      }
      if (!targetRestaurantId) {
        const firstRest = await prisma.restaurant.findFirst();
        targetRestaurantId = firstRest?.id;
      }

      let customerData: any = null;
      if (body.customerId) {
        customerData = await prisma.customer.findUnique({ where: { id: body.customerId } });
      }

      let restaurantData: any = null;
      if (targetRestaurantId) {
        restaurantData = await prisma.restaurant.findUnique({ where: { id: targetRestaurantId } });
      }

      const rawOrderNumber = (createdOrder as any).orderNumber || (createdOrder as any)._orderNumber;
      const rawType = (createdOrder as any).type || (createdOrder as any)._type || body.type || 'BALCAO';
      const rawStatus = (createdOrder as any).status || (createdOrder as any)._status || 'RECEBIDO';

      const itemsForPrint = await Promise.all((body.items || []).map(async (it: any) => {
        let prodName = it.productName || it.name;
        let priceVal = it.unitPrice || (it.priceCents ? (it.priceCents / 100).toFixed(2) : '0,00');
        if (!prodName && it.productId) {
          const p = await prisma.product.findUnique({ where: { id: it.productId } });
          prodName = p?.name;
          if (p?.price) priceVal = Number(p.price).toFixed(2);
        }
        const qty = it.quantity || 1;
        const totalNum = Number(priceVal) * qty;
        return {
          productName: prodName || 'Item',
          quantity: qty,
          unitPriceFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(priceVal)),
          totalPriceFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalNum),
          notes: it.notes || '',
          assemblies: it.assemblies || [],
          modifiers: it.modifiers || [],
          complements: it.complements || []
        };
      }));

      const deliveryAddress = body.deliveryAddress || (customerData ? {
        street: customerData.addressStreet,
        number: customerData.addressNumber,
        complement: customerData.addressComplement,
        neighborhood: customerData.addressNeighborhood,
        city: customerData.addressCity,
        state: customerData.addressState,
        zipCode: customerData.addressZipCode,
        reference: body.addressReference
      } : undefined);

      const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      const subtotalVal = (createdOrder as any).subtotal?.amount ?? (createdOrder as any)._subtotal?.amount ?? (body.subtotalCents ? body.subtotalCents / 100 : 0);
      const deliveryFeeVal = (createdOrder as any).deliveryFee?.amount ?? (createdOrder as any)._deliveryFee?.amount ?? (body.deliveryFeeCents ? body.deliveryFeeCents / 100 : 0);
      const discountVal = (createdOrder as any).discountAmount?.amount ?? (createdOrder as any)._discountAmount?.amount ?? 0;
      const totalVal = (createdOrder as any).totalAmount?.amount ?? (createdOrder as any)._totalAmount?.amount ?? (subtotalVal + deliveryFeeVal - discountVal);

      const restAddress = restaurantData
        ? [restaurantData.addressStreet, restaurantData.addressNumber, restaurantData.addressNeighborhood, restaurantData.addressCity].filter(Boolean).join(', ')
        : '';

      const { realtimeBus } = await import('$lib/server/realtimeBus');
      realtimeBus.publish('ORDER_EVENT', 'ORDER_CREATED', {
        restaurantId: targetRestaurantId,
        restaurantName: restaurantData?.name,
        restaurantPhone: restaurantData?.phone,
        restaurantCnpj: restaurantData?.cnpj,
        restaurantAddress: restAddress,
        orderNumber: rawOrderNumber,
        type: rawType,
        sector: rawType === 'DELIVERY' ? 'TODOS' : 'COZINHA',
        status: rawStatus,
        paymentMethod: (createdOrder as any).paymentMethod || (createdOrder as any)._paymentMethod || body.paymentMethod || 'BALCAO',
        paymentStatus: (createdOrder as any).paymentStatus || (createdOrder as any)._paymentStatus || body.paymentStatus || 'PENDENTE',
        changeFor: body.changeFor ? `R$ ${body.changeFor}` : undefined,
        tableNumber: (createdOrder as any).tableNumber || body.tableNumber,
        customerName: customerData?.name || (createdOrder as any).customerName || body.customerName,
        customerPhone: customerData?.phone || (createdOrder as any).customerPhone || body.customerPhone,
        customerCpf: customerData?.cpf || body.customerCpf,
        deliveryAddress,
        orderNotes: (createdOrder as any).notes || (createdOrder as any)._notes || body.notes,
        subtotalFormatted: fmt(subtotalVal),
        deliveryFeeFormatted: fmt(deliveryFeeVal),
        discountFormatted: fmt(discountVal),
        totalAmountFormatted: fmt(totalVal),
        createdAt: new Date().toISOString(),
        items: itemsForPrint
      });
      console.log(`[API Orders] 🖨️ ORDER_EVENT completo publicado para impressoras (Restaurante: ${restaurantData?.name || targetRestaurantId}, Pedido #${rawOrderNumber})`);
    } catch (errPub) {
      console.error('[API Orders] Erro ao publicar ORDER_EVENT:', errPub);
    }

    return json({
      success: true,
      order: createdOrder
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro no servidor ao criar pedido: ${err.message}` }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Acesso negado: usuário não autenticado.' }, { status: 401 });
  }

  try {
    const shiftId = url.searchParams.get('shiftId') || undefined;
    const tableId = url.searchParams.get('tableId') || undefined;
    const type = (url.searchParams.get('type') as any) || undefined;

    const rawOrders = await prisma.order.findMany({
      where: {
        shiftId,
        tableId,
        type
      },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return json({
      success: true,
      orders: rawOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        type: o.type,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        tableId: o.tableId,
        totalAmountCents: Math.round(Number(o.totalAmount || 0) * 100),
        formattedTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(o.totalAmount || 0)),
        createdAt: o.createdAt,
        itemsCount: o.items.length
      }))
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao listar pedidos: ${err.message}` }, { status: 500 });
  }
};
