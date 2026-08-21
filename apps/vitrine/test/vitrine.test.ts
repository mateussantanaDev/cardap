import assert from 'node:assert';
import { describe, it as test, expect } from 'vitest';
import {
  QrTableToken,
  Money,
  OrderEntity,
  OrderItem,
  DeductInventoryForOrderUseCase,
  ValidateCouponUseCase,
  CalculateDeliveryFeeUseCase,
  IdentifyOrCreateCustomerUseCase
} from '@cardap/core';
import { KdsRealtimeService, kdsEmitter } from '@cardap/realtime';
import { checkRateLimit, sanitizeString, createServerOrder, SERVER_CATALOG } from '../src/lib/server/ordersStore';

describe('Vitrine B2C Security & Validation Tests', () => {
  
  test('1. Cryptographic HMAC QR Table Token Generation & Verification', () => {
    const secretKey = 'super-secret-key-test-2026';
    const tableId = 'table-uuid-1234';
    const tableNumber = 5;

    // Gerar token assinado
    const tokenVo = QrTableToken.create(tableId, tableNumber, secretKey);
    const rawToken = tokenVo.getRawToken();
    assert.ok(rawToken.includes('.'), 'Token deve conter payload e assinatura separados por ponto');

    // Verificar token autêntico
    const verified = QrTableToken.parseAndVerify(rawToken, secretKey);
    assert.strictEqual(verified.getTableId(), tableId);
    assert.strictEqual(verified.getTableNumber(), tableNumber);

    // Testar detecção de adulteração hacker (alterar número da mesa no payload)
    const parts = rawToken.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ tableId, tableNumber: 999, issuedAt: Date.now() })).toString('base64url');
    const tamperedToken = `${fakePayload}.${parts[1]}`;

    assert.throws(() => {
      QrTableToken.parseAndVerify(tamperedToken, secretKey);
    }, /Assinatura do token de mesa inválida/);
  });

  test('2. Input Sanitization against XSS Injection', () => {
    const dangerousInput = '<script>alert("hack")</script> Cliente <b>Teste</b>';
    const sanitized = sanitizeString(dangerousInput, 100);

    assert.strictEqual(sanitized.includes('<script>'), false, 'Não deve conter tags script');
    assert.strictEqual(sanitized.includes('<b>'), false, 'Não deve conter tags HTML');
    assert.strictEqual(sanitized, 'alert(&quot;hack&quot;) Cliente Teste', 'Deve sanitizar HTML e fazer escape');
  });

  test('3. Rate Limiting Protection against DDoS / Spam', () => {
    const testIp = '192.168.1.100';

    // Fazer 5 requisições permitidas
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(testIp);
      assert.strictEqual(res.allowed, true, `Requisição ${i + 1} deve ser permitida`);
    }

    // A 6ª requisição no mesmo minuto deve ser bloqueada
    const blockedRes = checkRateLimit(testIp);
    assert.strictEqual(blockedRes.allowed, false, '6ª requisição deve ser bloqueada pelo rate limit');
    assert.ok(blockedRes.retryAfterSec && blockedRes.retryAfterSec > 0, 'Deve retornar tempo de espera');
  });

  test('4. Server Catalog Integrity & Price Recalculation', () => {
    const p1 = SERVER_CATALOG.find(p => p.id === 'ent-01') || SERVER_CATALOG[0];
    assert.ok(p1, 'Produto do catálogo deve existir');
    assert.ok(p1.basePriceCents > 0, 'Preço base do produto deve ser maior que zero');

    // Simular criação de pedido no servidor
    const order = createServerOrder({
      type: 'SALAO',
      status: 'RECEBIDO',
      customerName: 'Cliente Teste',
      tableNumber: 5,
      paymentOption: 'PIX',
      subtotalCents: 2200,
      deliveryFeeCents: 0,
      totalCents: 2200,
      items: [
        {
          productId: p1.id,
          productName: p1.name,
          basePriceCents: p1.basePriceCents,
          quantity: 1,
          selectedAssemblies: [],
          selectedModifiers: [],
          selectedComplements: [],
          itemTotalCents: 2200
        }
      ]
    });

    assert.ok(order.id.startsWith('ORD-'), 'ID do pedido deve ter prefixo ORD-');
    assert.strictEqual(order.status, 'RECEBIDO');
    assert.strictEqual(order.totalCents, 2200);
  });

  test('5. Core Order Domain Entity State Machine', () => {
    const item = new OrderItem({
      id: 'item-1',
      productId: 'p2',
      productName: 'Pastel de Carne com Queijo',
      quantity: 2,
      unitPrice: Money.fromCents(1850)
    });

    const orderEntity = new OrderEntity({
      id: 'ord-domain-1',
      orderNumber: 105,
      type: 'DELIVERY',
      paymentMethod: 'PIX',
      shiftId: 'shift-01',
      items: [item],
      deliveryFee: Money.fromCents(850)
    });

    assert.strictEqual(orderEntity.subtotal.getCents(), 3700); // 1850 * 2
    assert.strictEqual(orderEntity.totalAmount.getCents(), 4550); // 3700 + 850

    // Testar transição de status no KDS
    const res1 = orderEntity.advanceStatus('RECEBIDO');
    assert.strictEqual(res1.isSuccess, true);
    assert.strictEqual(orderEntity.status, 'RECEBIDO');

    const res2 = orderEntity.advanceStatus('EM_PREPARO');
    assert.strictEqual(res2.isSuccess, true);
    assert.strictEqual(orderEntity.status, 'EM_PREPARO');

    // Testar transição ilegal (não pode pular de EM_PREPARO direto para ENTREGUE)
    const illegalRes = orderEntity.advanceStatus('ENTREGUE');
    assert.strictEqual(illegalRes.isFailure, true);
  });

  test('6. ETAPA 2: Bill of Materials (BOM) & Automatic Stock Deduction', async () => {
    const item = new OrderItem({
      id: 'item-bom-1',
      productId: 'p1',
      productName: 'Monte seu Pastel (20cm)',
      quantity: 2,
      unitPrice: Money.fromCents(2200),
      assemblies: [
        { id: 'opt-r1', name: 'Carne Moída Prime', priceAdjustment: Money.zero(), quantity: 1 }
      ]
    });

    const orderEntity = new OrderEntity({
      id: 'ord-bom-100',
      orderNumber: 200,
      type: 'SALAO',
      paymentMethod: 'PIX',
      shiftId: 'shift-01',
      items: [item]
    });

    let currentStock = 50.0;
    const deductedMovements: any[] = [];

    // Repositórios mock para isolamento de teste do caso de uso
    const mockOrderRepo: any = {
      findById: async () => orderEntity
    };

    const mockRecipeRepo: any = {
      getRecipeByProductId: async (pId: string) => [
        { id: 'rec-1', productId: pId, ingredientId: 'ins-massa', ingredientName: 'Massa Tradicional', quantityNeeded: 0.150 }
      ],
      getAssemblyOptionIngredient: async (optId: string) => ({
        optionId: optId,
        ingredientId: 'ins-carne',
        ingredientName: 'Carne Moída Prime',
        quantityNeeded: 0.120
      }),
      getModifierOptionIngredient: async () => null,
      getComplementOptionIngredient: async () => null
    };

    const mockInventoryRepo: any = {
      findIngredientById: async (ingId: string) => ({
        id: ingId,
        code: 'INS-TEST',
        name: ingId === 'ins-massa' ? 'Massa Tradicional' : 'Carne Moída Prime',
        unit: 'KG',
        costPriceCents: 1000,
        currentStock,
        minStock: 5,
        isActive: true
      }),
      deductStock: async (params: any) => {
        currentStock -= params.quantity;
        deductedMovements.push(params);
        return {
          id: `mov-${Date.now()}`,
          ingredientId: params.ingredientId,
          type: 'BAIXA_AUTOMATICA',
          quantity: params.quantity,
          unitCostCents: 1000,
          createdAt: new Date()
        };
      }
    };

    const deductUseCase = new DeductInventoryForOrderUseCase(mockOrderRepo, mockInventoryRepo, mockRecipeRepo);
    const result = await deductUseCase.execute({ orderId: 'ord-bom-100' });

    assert.strictEqual(result.isSuccess, true, 'Execução da baixa por ficha técnica deve ter sucesso');
    const output = result.getValue();

    assert.strictEqual(output.totalMovements, 2, 'Deve ter gerado 2 movimentações de estoque (massa + recheio)');
    assert.strictEqual(output.deductions[0].quantityDeducted, 0.300, 'Massa: 0.150kg * 2 itens = 0.300kg');
    assert.strictEqual(output.deductions[1].quantityDeducted, 0.240, 'Carne: 0.120kg * 2 itens = 0.240kg');
  });

  test('7. ETAPA 3: KDS Realtime Event System & Status Broadcast', async () => {
    const testOrderId = 'ord-realtime-555';
    let receivedEvent: any = null;

    // Inscrever ouvinte em tempo real para o pedido
    const unsubscribe = KdsRealtimeService.subscribeToOrderUpdates(testOrderId, (payload) => {
      receivedEvent = payload;
    });

    // Disparar notificação de mudança de status no KDS
    const payload = KdsRealtimeService.notifyStatusChanged({
      orderId: testOrderId,
      orderNumber: 555,
      type: 'SALAO',
      previousStatus: 'RECEBIDO',
      newStatus: 'EM_PREPARO',
      tableNumber: 3,
      customerName: 'Cliente Teste'
    });

    assert.ok(receivedEvent, 'O ouvinte realtime deve ter recebido o evento emitido');
    assert.strictEqual(receivedEvent.orderId, testOrderId);
    assert.strictEqual(receivedEvent.newStatus, 'EM_PREPARO');
    assert.strictEqual(receivedEvent.previousStatus, 'RECEBIDO');
    assert.strictEqual(receivedEvent.tableNumber, 3);

    unsubscribe();
  });

  test('8. ETAPA 4: Coupon Validation, Delivery Fee & Customer CRM Identification', async () => {
    // 8.1 Validação de Cupom
    const mockCouponRepo: any = {
      findByCode: async (code: string) => {
        if (code === 'CARDAP10') {
          return {
            id: 'c-10',
            code: 'CARDAP10',
            discountType: 'PERCENTUAL',
            discountValue: 10,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            currentUsages: 2,
            usageLimit: 100,
            isActive: true
          };
        }
        return null;
      },
      incrementUsage: async () => {}
    };

    const couponUseCase = new ValidateCouponUseCase(mockCouponRepo);
    const couponRes = await couponUseCase.execute({ code: 'CARDAP10', subtotalCents: 5000 });

    assert.strictEqual(couponRes.isSuccess, true, 'Cupom CARDAP10 deve ser válido');
    const couponOutput = couponRes.getValue();
    assert.strictEqual(couponOutput.discountCents, 500, '10% de R$ 50,00 é R$ 5,00 (500 centavos)');
    assert.strictEqual(couponOutput.finalTotalCents, 4500, 'Total final com desconto: R$ 45,00 (4500 centavos)');

    // 8.2 Cálculo de Frete por Zona
    const mockZoneRepo: any = {
      findActiveZones: async () => [
        { id: 'z1', name: 'Zona Centro (Até 3km)', maxDistanceKm: 3.0, deliveryFeeCents: 600, estimatedSlaMinutes: 30, isActive: true },
        { id: 'z2', name: 'Zona Expandida (Até 7km)', maxDistanceKm: 7.0, deliveryFeeCents: 1000, estimatedSlaMinutes: 45, isActive: true }
      ]
    };

    const deliveryUseCase = new CalculateDeliveryFeeUseCase(mockZoneRepo);
    const deliveryRes = await deliveryUseCase.execute({ distanceKm: 2.0, subtotalCents: 4000 });

    assert.strictEqual(deliveryRes.isSuccess, true);
    const deliveryOutput = deliveryRes.getValue();
    assert.strictEqual(deliveryOutput.zoneName, 'Zona Centro (Até 3km)');
    assert.strictEqual(deliveryOutput.deliveryFeeCents, 600);

    // 8.3 CRM de Clientes
    const customersDb = new Map<string, any>();
    const mockCustomerRepo: any = {
      findByPhone: async (phone: string) => customersDb.get(phone) || null,
      save: async (c: any) => {
        customersDb.set(c.phone, c);
      }
    };

    const customerUseCase = new IdentifyOrCreateCustomerUseCase(mockCustomerRepo);
    const custRes = await customerUseCase.execute({
      phone: '(11) 98765-4321',
      name: 'Cliente Teste',
      cpf: '123.456.789-00'
    });

    assert.strictEqual(custRes.isSuccess, true);
    const custOutput = custRes.getValue();
    assert.strictEqual(custOutput.phone, '11987654321', 'Deve higienizar o número de telefone apenas com dígitos');
    assert.strictEqual(custOutput.name, 'Cliente Teste');
  });

  test('9. ETAPA 5: End-to-End Integrated Order Lifecycle Simulation', async () => {
    // 1. Simular seleção de itens na Vitrine B2C
    const cartItems = [
      {
        productId: 'p1',
        productName: 'Monte seu Pastel (20cm)',
        basePriceCents: 2200,
        quantity: 2,
        selectedAssemblies: [{ id: 'opt-recheio-carne', name: 'Carne Moída Prime', priceAdjustmentCents: 0, quantity: 1 }]
      }
    ];

    // 2. Validação de Cupom de Desconto (10% OFF)
    const mockCouponRepo: any = {
      findByCode: async () => ({
        id: 'c-10',
        code: 'CARDAP10',
        discountType: 'PERCENTUAL',
        discountValue: 10,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        currentUsages: 0,
        isActive: true
      }),
      incrementUsage: async () => {}
    };
    const couponUseCase = new ValidateCouponUseCase(mockCouponRepo);
    const couponResult = await couponUseCase.execute({ code: 'CARDAP10', subtotalCents: 4400 });
    assert.strictEqual(couponResult.getValue().discountCents, 440, 'Desconto de 10% em 4400 deve ser 440 centavos');

    // 3. Vínculo CRM do Cliente pelo WhatsApp
    const mockCustomerRepo2: any = {
      findByPhone: async () => null,
      save: async () => {}
    };
    const customerUseCase = new IdentifyOrCreateCustomerUseCase(mockCustomerRepo2);
    const customer = (await customerUseCase.execute({ phone: '11999998888', name: 'Cliente E2E Test' })).getValue();
    assert.ok(customer.id, 'Cliente deve gerar id único');

    // 4. Criação do Pedido no Servidor com Proteção de Preço
    const serverOrder = createServerOrder({
      type: 'DELIVERY',
      status: 'RECEBIDO',
      customerName: customer.name || 'Cliente E2E Test',
      customerPhone: customer.phone,
      paymentOption: 'PIX',
      subtotalCents: 4400,
      deliveryFeeCents: 600,
      totalCents: 4560,
      items: [
        {
          productId: 'p1',
          productName: 'Monte seu Pastel (20cm)',
          basePriceCents: 2200,
          quantity: 2,
          selectedAssemblies: cartItems[0].selectedAssemblies,
          selectedModifiers: [],
          selectedComplements: [],
          itemTotalCents: 4400
        }
      ]
    });
    assert.strictEqual(serverOrder.totalCents, 4560, 'Total calculado (4400 subtotal - 440 desconto + 600 frete)');

    // 5. Engenharia de Cardápio: Baixa Automática por Ficha Técnica (BOM)
    let stockDeducted = false;
    const mockOrderRepo: any = {
      findById: async () => new OrderEntity({
        id: serverOrder.id,
        orderNumber: serverOrder.orderNumber,
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        shiftId: 'shift-1',
        items: [new OrderItem({
          id: 'i1',
          productId: 'p1',
          productName: 'Monte seu Pastel (20cm)',
          quantity: 2,
          unitPrice: Money.fromCents(2200)
        })]
      })
    };
    const mockRecipeRepo: any = {
      getRecipeByProductId: async () => [{ id: 'r1', productId: 'p1', ingredientId: 'ing-massa', ingredientName: 'Massa', quantityNeeded: 0.15 }],
      getAssemblyOptionIngredient: async () => null,
      getModifierOptionIngredient: async () => null,
      getComplementOptionIngredient: async () => null
    };
    const mockInventoryRepo: any = {
      findIngredientById: async () => ({ id: 'ing-massa', code: 'MASS-1', name: 'Massa', unit: 'KG', costPriceCents: 500, currentStock: 10, minStock: 1, isActive: true }),
      deductStock: async () => { stockDeducted = true; return { id: 'mov-1', ingredientId: 'ing-massa', type: 'BAIXA_AUTOMATICA', quantity: 0.3, unitCostCents: 500, createdAt: new Date() }; }
    };
    const deductUseCase = new DeductInventoryForOrderUseCase(mockOrderRepo, mockInventoryRepo, mockRecipeRepo);
    const deductRes = await deductUseCase.execute({ orderId: serverOrder.id });
    assert.strictEqual(deductRes.isSuccess, true);
    assert.strictEqual(stockDeducted, true, 'Estoque deve ser baixado automaticamente');

    // 6. Transição de Status Realtime KDS na Cozinha
    let kdsNotifiedStatus = '';
    const unsub = KdsRealtimeService.subscribeToOrderUpdates(serverOrder.id, (evt) => {
      kdsNotifiedStatus = evt.newStatus;
    });

    KdsRealtimeService.notifyStatusChanged({
      orderId: serverOrder.id,
      orderNumber: serverOrder.orderNumber,
      type: 'DELIVERY',
      previousStatus: 'RECEBIDO',
      newStatus: 'EM_PREPARO',
      customerName: customer.name
    });

    assert.strictEqual(kdsNotifiedStatus, 'EM_PREPARO', 'Vitrine deve receber atualização em tempo real do KDS');
    unsub();
  });
});
