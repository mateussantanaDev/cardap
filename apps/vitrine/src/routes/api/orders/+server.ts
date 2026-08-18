import { json, type RequestHandler } from '@sveltejs/kit';
import { QrTableToken, CreateOrderUseCase, Money } from '@cardap/core';
import { PrismaOrderRepository, PrismaTableRepository, PrismaCashShiftRepository } from '@cardap/database';
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

    // 2. Validação e Sanitização dos campos do formulário
    const isTableFlow = Boolean(body.isTableFlow);
    const orderType = isTableFlow ? 'SALAO' : 'DELIVERY';

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

    // 3. Validação Específica por Canal (Salão x Delivery)
    if (isTableFlow) {
      const rawToken = body.token;
      if (!rawToken) {
        return json(
          { success: false, error: 'Token de identificação da mesa é obrigatório para pedidos no salão.' },
          { status: 400 }
        );
      }

      // Validação Criptográfica HMAC do Token da Mesa (evita adulteração do ID da mesa)
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
    } else {
      customerPhone = sanitizeString(body.customerPhone, 30);
      if (!customerPhone || customerPhone.length < 8) {
        return json(
          { success: false, error: 'Número de telefone/WhatsApp válido é obrigatório para entregas.' },
          { status: 400 }
        );
      }

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

    // 4. Validação de Itens da Comanda (Anti-Price-Tampering)
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
      const product = SERVER_CATALOG.find(p => p.id === rawItem.productId);
      if (!product) {
        return json(
          { success: false, error: `Produto ID '${rawItem.productId}' não encontrado no catálogo oficial.` },
          { status: 400 }
        );
      }

      const quantity = Math.max(1, Math.min(99, Math.floor(Number(rawItem.quantity) || 1)));
      let unitPriceCents = product.basePriceCents;
      const validatedAssemblies: Array<{ id: string; name: string; priceAdjustmentCents: number; quantity: number }> = [];

      // Validar montagens/opções selecionadas contra o catálogo oficial
      if (Array.isArray(rawItem.selectedAssemblies) && product.assemblyGroups) {
        for (const sel of rawItem.selectedAssemblies) {
          let foundOpt = false;
          for (const grp of product.assemblyGroups) {
            const opt = grp.options.find(o => o.id === sel.id);
            if (opt) {
              validatedAssemblies.push({
                id: opt.id,
                name: opt.name,
                priceAdjustmentCents: opt.priceAdjustmentCents,
                quantity: 1
              });
              unitPriceCents += opt.priceAdjustmentCents;
              foundOpt = true;
              break;
            }
          }
          if (!foundOpt) {
            return json(
              { success: false, error: `Opção de montagem '${sel.name}' inválida para o produto ${product.name}.` },
              { status: 400 }
            );
          }
        }
      }

      const itemTotalCents = unitPriceCents * quantity;
      calculatedSubtotalCents += itemTotalCents;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        basePriceCents: product.basePriceCents,
        quantity,
        notes: sanitizeString(rawItem.notes || '', 300),
        selectedAssemblies: validatedAssemblies,
        selectedModifiers: [],
        selectedComplements: [],
        itemTotalCents
      });
    }

    const deliveryFeeCents = isTableFlow ? 0 : 850;
    const totalCents = calculatedSubtotalCents + deliveryFeeCents;

    const paymentOption = ['PIX', 'DINHEIRO_ENTREGA', 'CARTAO_ENTREGA'].includes(body.paymentOption)
      ? body.paymentOption
      : 'PIX';

    // 5. Tentar Persistir via Caso de Uso e Repositório Prisma se Banco Estiver Disponível
    try {
      const orderRepo = new PrismaOrderRepository();
      const tableRepo = new PrismaTableRepository();
      const shiftRepo = new PrismaCashShiftRepository();

      const activeShift = await shiftRepo.findCurrentOpenShift();
      const shiftId = activeShift ? activeShift.id : 'shift-default-01';

      const createOrderUseCase = new CreateOrderUseCase(orderRepo, tableRepo);
      const result = await createOrderUseCase.execute({
        type: orderType,
        shiftId,
        paymentMethod: paymentOption === 'PIX' ? 'PIX' : (paymentOption === 'CARTAO_ENTREGA' ? 'CARTAO_CREDITO' : 'DINHEIRO'),
        tableQrToken: isTableFlow ? body.token : undefined,
        tableId,
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
          totalCents: output.totalAmountCents
        });
      }
    } catch (err) {
      // Fallback para persistência na memória se banco de dados estiver inacessível
    }

    // 6. Persistência Fallback de Servidor
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
      totalCents: createdOrder.totalCents
    });
  } catch (err: any) {
    return json(
      { success: false, error: `Erro interno ao processar pedido: ${err.message}` },
      { status: 500 }
    );
  }
};
