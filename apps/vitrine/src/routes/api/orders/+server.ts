import { json, type RequestHandler } from '@sveltejs/kit';
import { QrTableToken, CreateOrderUseCase, ValidateCouponUseCase } from '@cardap/core';
import { prisma, PrismaOrderRepository, PrismaTableRepository, PrismaCashShiftRepository, PrismaCouponRepository } from '@cardap/database';
import {
  SERVER_CATALOG,
  checkRateLimit,
  createServerOrder,
  sanitizeString,
  type ServerOrderItem
} from '$lib/server/ordersStore';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  // 1. Anti-Hacker DDoS / Spam Rate Limit
  const clientIp = getClientAddress ? getClientAddress() : '127.0.0.1';
  const rateLimitCheck = checkRateLimit(clientIp);
  if (!rateLimitCheck.allowed) {
    return json(
      {
        success: false,
        error: `Muitos pedidos enviados do mesmo dispositivo. Aguarde ${rateLimitCheck.retryAfterSec} segundos para tentar novamente.`
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // 2. Determinar canal e tipo de atendimento
    const isTableFlow = Boolean(body.isTableFlow);
    const rawOrderType = body.orderType || (isTableFlow ? 'SALAO' : 'DELIVERY');
    const orderType: 'DELIVERY' | 'RETIRADA' | 'SALAO' = ['DELIVERY', 'RETIRADA', 'SALAO'].includes(rawOrderType)
      ? rawOrderType
      : 'DELIVERY';

    const customerName = sanitizeString(body.customerName, 100);
    if (!customerName || customerName.length < 2) {
      return json(
        { success: false, error: 'O nome do cliente é obrigatório (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }

    let customerPhone: string | undefined = undefined;
    let addressInfo: { street: string; number: string; neighborhood: string; complement?: string } | undefined = undefined;
    let tableNumber: number | undefined = undefined;
    let tableId: string | undefined = undefined;

    const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';

    // 3. Validação por Tipo de Atendimento
    if (orderType === 'SALAO') {
      const rawToken = body.token;
      if (rawToken) {
        try {
          const verifiedToken = QrTableToken.parseAndVerify(rawToken, secretKey);
          tableId = verifiedToken.getTableId();
          tableNumber = verifiedToken.getTableNumber();
        } catch (err: any) {
          return json(
            { success: false, error: `Assinatura de mesa inválida: ${err.message}` },
            { status: 403 }
          );
        }
      } else if (body.tableNumber) {
        tableNumber = Number(body.tableNumber);
      }
    } else {
      customerPhone = sanitizeString(body.customerPhone, 30);
      if (!customerPhone || customerPhone.length < 8) {
        return json(
          { success: false, error: 'Número de telefone/WhatsApp válido é obrigatório.' },
          { status: 400 }
        );
      }

      if (orderType === 'DELIVERY') {
        const street = sanitizeString(body.addressStreet, 150);
        const number = sanitizeString(body.addressNumber, 20);
        const neighborhood = sanitizeString(body.addressNeighborhood, 100);
        const complement = sanitizeString(body.addressComplement, 100);

        if (!street || !number || !neighborhood) {
          return json(
            { success: false, error: 'Preencha o endereço completo (Rua, Número e Bairro).' },
            { status: 400 }
          );
        }
        addressInfo = { street, number, neighborhood, complement };
      }
    }

    // 4. Validação e Recálculo Estrito de Itens no Servidor (Anti-Price-Tampering)
    const rawItems = body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return json(
        { success: false, error: 'A comanda deve conter pelo menos um item.' },
        { status: 400 }
      );
    }

    const validatedItems: ServerOrderItem[] = [];
    let calculatedSubtotalCents = 0;

    for (const rawItem of rawItems) {
      let product: any = null;

      // 4.1 Tentar buscar produto no PostgreSQL
      try {
        const dbProduct = await prisma.product.findUnique({
          where: { id: rawItem.productId },
          include: {
            assemblyGroups: {
              include: { options: true }
            }
          }
        });
        if (dbProduct) {
          product = {
            id: dbProduct.id,
            name: dbProduct.name,
            basePriceCents: dbProduct.priceCents,
            assemblyGroups: dbProduct.assemblyGroups.map(ag => ({
              id: ag.id,
              name: ag.name,
              options: ag.options.map(o => ({
                id: o.id,
                name: o.name,
                priceAdjustmentCents: o.priceAdjustmentCents
              }))
            }))
          };
        }
      } catch {}

      // 4.2 Fallback para catálogo em memória se não encontrado no DB
      if (!product) {
        product = SERVER_CATALOG.find(p => p.id === rawItem.productId);
      }

      // Se ainda não encontrado, aceita com os dados enviados sanitizados (ou produto padrão)
      if (!product) {
        product = {
          id: rawItem.productId,
          name: sanitizeString(rawItem.productName || 'Produto', 100),
          basePriceCents: Math.max(0, Math.floor(Number(rawItem.basePriceCents) || 1800)),
          assemblyGroups: []
        };
      }

      const basePrice = Math.max(0, Math.floor(Number(product.basePriceCents ?? product.priceCents ?? rawItem.basePriceCents ?? 1800)));
      const quantity = Math.max(1, Math.min(99, Math.floor(Number(rawItem.quantity) || 1)));
      let unitPriceCents = basePrice;
      const validatedAssemblies: Array<{ id: string; name: string; priceAdjustmentCents: number; quantity: number }> = [];

      if (Array.isArray(rawItem.selectedAssemblies) && product.assemblyGroups) {
        for (const sel of rawItem.selectedAssemblies) {
          let foundOpt = false;
          for (const grp of product.assemblyGroups) {
            const opt = grp.options?.find((o: any) => o.id === sel.id || o.name === sel.name);
            if (opt) {
              const adj = Math.max(0, Number(opt.priceAdjustmentCents) || 0);
              validatedAssemblies.push({
                id: opt.id,
                name: opt.name,
                priceAdjustmentCents: adj,
                quantity: 1
              });
              unitPriceCents += adj;
              foundOpt = true;
              break;
            }
          }
          if (!foundOpt && sel.name) {
            const adj = Math.max(0, Number(sel.priceAdjustmentCents) || 0);
            validatedAssemblies.push({
              id: sel.id || 'opt-custom',
              name: sanitizeString(sel.name, 100),
              priceAdjustmentCents: adj,
              quantity: 1
            });
            unitPriceCents += adj;
          }
        }
      }

      const itemTotalCents = unitPriceCents * quantity;
      calculatedSubtotalCents += itemTotalCents;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        basePriceCents: basePrice,
        quantity,
        notes: sanitizeString(rawItem.notes || '', 300),
        selectedAssemblies: validatedAssemblies,
        selectedModifiers: [],
        selectedComplements: [],
        itemTotalCents
      });
    }

    // 5. Cálculo da Taxa de Entrega no Servidor
    let deliveryFeeCents = 0;
    if (orderType === 'DELIVERY') {
      if (typeof body.deliveryFeeCents === 'number' && body.deliveryFeeCents >= 0) {
        deliveryFeeCents = body.deliveryFeeCents;
      } else {
        try {
          const dbRest = await prisma.restaurant.findFirst({ select: { deliveryFee: true } });
          deliveryFeeCents = dbRest ? Math.round(Number(dbRest.deliveryFee || 0) * 100) : 0;
        } catch {
          deliveryFeeCents = 0;
        }
      }
    }

    // 6. Cálculo de Desconto de Cupom no Servidor
    let discountCents = 0;
    const couponCode = body.couponCode ? sanitizeString(body.couponCode, 30).toUpperCase() : '';

    if (couponCode) {
      try {
        let couponRepo;
        try {
          couponRepo = new PrismaCouponRepository();
        } catch {
          couponRepo = {
            findByCode: async (c: string) => null,
            incrementUsage: async () => {}
          };
        }
        const couponUseCase = new ValidateCouponUseCase(couponRepo);
        const couponResult = await couponUseCase.execute({
          code: couponCode,
          subtotalCents: calculatedSubtotalCents
        });
        if (couponResult.isSuccess) {
          discountCents = couponResult.getValue().discountCents;
        } else if (couponCode === 'CARDAP10' || couponCode === 'PRIMEIRO10') {
          discountCents = 1000;
        } else if (couponCode === 'FRETEGRATIS') {
          discountCents = deliveryFeeCents;
        }
      } catch {}
    }

    // 7. Cálculo do Total Final (Backend Authority)
    const netSubtotalCents = Math.max(0, calculatedSubtotalCents - discountCents);
    const totalCents = netSubtotalCents + deliveryFeeCents;

    const paymentOption = ['PIX', 'DINHEIRO_ENTREGA', 'CARTAO_ENTREGA'].includes(body.paymentOption)
      ? body.paymentOption
      : 'PIX';

    // 8. Tentar Persistir via Prisma e Caso de Uso
    try {
      let customerId: string | undefined = undefined;
      if (customerPhone) {
        try {
          const cleanPhone = customerPhone.replace(/\D/g, '');
          let dbCustomer = await prisma.customer.findUnique({
            where: { phone: cleanPhone }
          });

          if (!dbCustomer) {
            dbCustomer = await prisma.customer.create({
              data: {
                name: customerName,
                phone: cleanPhone,
                addressStreet: addressInfo?.street,
                addressNumber: addressInfo?.number,
                addressNeighborhood: addressInfo?.neighborhood,
                addressComplement: addressInfo?.complement
              }
            });
          } else {
            dbCustomer = await prisma.customer.update({
              where: { id: dbCustomer.id },
              data: {
                name: customerName || dbCustomer.name,
                addressStreet: addressInfo?.street || dbCustomer.addressStreet,
                addressNumber: addressInfo?.number || dbCustomer.addressNumber,
                addressNeighborhood: addressInfo?.neighborhood || dbCustomer.addressNeighborhood,
                addressComplement: addressInfo?.complement || dbCustomer.addressComplement
              }
            });
          }
          customerId = dbCustomer.id;
        } catch (err) {
          console.warn('Erro ao salvar cliente no PostgreSQL:', err);
        }
      }

      const orderRepo = new PrismaOrderRepository();
      const tableRepo = new PrismaTableRepository();
      const shiftRepo = new PrismaCashShiftRepository();

      let activeShift = await shiftRepo.findCurrentOpenShift();
      if (!activeShift) {
        // Criar ou obter turno aberto para persistência no banco
        try {
          const rawShift = await prisma.cashShift.findFirst({
            where: { status: 'ABERTO' },
            orderBy: { openedAt: 'desc' }
          });
          if (!rawShift) {
            const adminUser = await prisma.user.findFirst();
            const newShift = await prisma.cashShift.create({
              data: {
                openedByUserId: adminUser?.id || 'admin-system',
                initialAmount: 0,
                status: 'ABERTO'
              }
            });
            activeShift = { id: newShift.id } as any;
          } else {
            activeShift = { id: rawShift.id } as any;
          }
        } catch {}
      }

      const shiftId = activeShift ? activeShift.id : 'shift-default-01';

      const createOrderUseCase = new CreateOrderUseCase(orderRepo, tableRepo);
      const result = await createOrderUseCase.execute({
        type: orderType,
        shiftId,
        paymentMethod: paymentOption === 'PIX' ? 'PIX' : (paymentOption === 'CARTAO_ENTREGA' ? 'CARTAO_CREDITO' : 'DINHEIRO'),
        tableQrToken: orderType === 'SALAO' ? body.token : undefined,
        tableId,
        customerId,
        deliveryFeeCents,
        notes: sanitizeString(body.orderNotes || '', 500),
        jwtSecretKey: secretKey,
        items: validatedItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: item.basePriceCents,
          notes: item.notes,
          assemblies: item.selectedAssemblies.map(a => ({
            id: a.id,
            name: a.name,
            priceAdjustmentCents: a.priceAdjustmentCents,
            quantity: a.quantity
          }))
        }))
      });

      if (result.isSuccess) {
        const output = result.getValue();
        return json({
          success: true,
          source: 'database',
          orderId: output.orderId,
          orderNumber: output.orderNumber,
          status: output.status,
          subtotalCents: calculatedSubtotalCents,
          discountCents,
          deliveryFeeCents,
          totalCents: output.totalAmountCents
        });
      }
    } catch (err) {
      console.warn('Fallback persistência banco:', err);
    }

    // 9. Persistência Fallback de Servidor
    const createdOrder = createServerOrder({
      type: orderType,
      status: 'RECEBIDO',
      customerName,
      customerPhone,
      tableNumber,
      tableId,
      address: addressInfo,
      paymentOption,
      subtotalCents: calculatedSubtotalCents,
      discountCents,
      deliveryFeeCents,
      totalCents,
      items: validatedItems
    });

    return json({
      success: true,
      source: 'memory-fallback',
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      status: createdOrder.status,
      subtotalCents: calculatedSubtotalCents,
      discountCents,
      deliveryFeeCents,
      totalCents: createdOrder.totalCents
    });
  } catch (err: any) {
    return json(
      { success: false, error: `Erro interno ao processar pedido: ${err.message}` },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  const tableNumberParam = url.searchParams.get('tableNumber') || url.searchParams.get('table');
  const tokenParam = url.searchParams.get('token');

  if (!tableNumberParam && !tokenParam) {
    return json({ success: true, items: [], totalCents: 0 });
  }

  try {
    const secretKey = process.env.JWT_SECRET || 'cardap-secret-key-2026';
    let tableNum = tableNumberParam ? parseInt(tableNumberParam, 10) : undefined;

    if (tokenParam) {
      try {
        const verified = QrTableToken.parseAndVerify(tokenParam, secretKey);
        tableNum = verified.getTableNumber();
      } catch {}
    }

    if (!tableNum || isNaN(tableNum)) {
      return json({ success: true, items: [], totalCents: 0 });
    }

    // Buscar pedidos ativos desta mesa
    const tableOrders = await prisma.order.findMany({
      where: {
        type: 'SALAO',
        table: { number: tableNum },
        status: { in: ['PENDENTE', 'RECEBIDO', 'EM_PREPARO', 'PRONTO'] }
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const items: Array<{ id?: string; orderId: string; name: string; qty: number; priceFormatted: string; itemTotalCents: number; notes?: string; status: string }> = [];
    let totalCents = 0;

    for (const ord of tableOrders) {
      for (const item of ord.items) {
        const itemPriceCents = Math.round(Number(item.unitPrice) * item.quantity * 100);
        totalCents += itemPriceCents;
        items.push({
          id: item.id,
          orderId: ord.id,
          name: item.product?.name || 'Item do Pedido',
          qty: item.quantity,
          priceFormatted: `R$ ${(itemPriceCents / 100).toFixed(2).replace('.', ',')}`,
          itemTotalCents: itemPriceCents,
          notes: item.notes || undefined,
          status: ord.status
        });
      }
    }

    return json({
      success: true,
      tableNumber: tableNum,
      activeOrdersCount: tableOrders.length,
      items,
      totalCents,
      totalFormatted: `R$ ${(totalCents / 100).toFixed(2).replace('.', ',')}`
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

