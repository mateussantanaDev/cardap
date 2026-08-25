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
      if (!activeShift) {
        return json(
          { success: false, error: 'Não é possível lançar pedidos sem um turno de caixa ABERTO no sistema.' },
          { status: 400 }
        );
      }
      targetShiftId = activeShift.id;
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

      const rawOrderNumber = (createdOrder as any).orderNumber || (createdOrder as any)._orderNumber;
      const rawType = (createdOrder as any).type || (createdOrder as any)._type || 'BALCAO';
      const rawStatus = (createdOrder as any).status || (createdOrder as any)._status || 'RECEBIDO';

      const itemsForPrint = await Promise.all((body.items || []).map(async (it: any) => {
        let prodName = it.productName || it.name;
        if (!prodName && it.productId) {
          const p = await prisma.product.findUnique({ where: { id: it.productId } });
          prodName = p?.name;
        }
        return {
          productName: prodName || 'Item',
          quantity: it.quantity || 1,
          notes: it.notes || '',
          assemblies: it.assemblies || [],
          modifiers: it.modifiers || [],
          complements: it.complements || []
        };
      }));

      const { realtimeBus } = await import('$lib/server/realtimeBus');
      realtimeBus.publish('ORDER_EVENT', 'ORDER_CREATED', {
        restaurantId: targetRestaurantId,
        orderNumber: rawOrderNumber,
        type: rawType,
        sector: 'COZINHA',
        status: rawStatus,
        tableNumber: (createdOrder as any).tableNumber || body.tableNumber,
        customerName: (createdOrder as any).customerName || body.customerName,
        customerPhone: (createdOrder as any).customerPhone || body.customerPhone,
        items: itemsForPrint
      });
      console.log(`[API Orders] 🖨️ ORDER_EVENT publicado para impressoras (Restaurante: ${targetRestaurantId}, Pedido #${rawOrderNumber})`);
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
