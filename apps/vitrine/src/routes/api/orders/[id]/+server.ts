import { json, type RequestHandler } from '@sveltejs/kit';
import { GetOrderStatusUseCase } from '@cardap/core';
import { PrismaOrderRepository } from '@cardap/database';
import { getServerOrderById, updateServerOrderStatus } from '$lib/server/ordersStore';

export const GET: RequestHandler = async ({ params }) => {
  const orderId = params.id;
  if (!orderId) {
    return json({ success: false, error: 'ID de pedido inválido.' }, { status: 400 });
  }

  // 1. Tentar consultar via repositório Prisma / PostgreSQL
  try {
    const orderRepo = new PrismaOrderRepository();
    const useCase = new GetOrderStatusUseCase(orderRepo);
    const result = await useCase.execute({ orderId });

    if (result.isSuccess) {
      return json({
        success: true,
        source: 'database',
        order: result.getValue()
      });
    }
  } catch (err) {
    // Fallback gracioso caso banco de dados esteja offline em ambiente de teste local
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
        customerName: 'Cliente Virtural',
        subtotalCents: 1850,
        deliveryFeeCents: 850,
        totalCents: 2700,
        items: [],
        createdAt: new Date().toISOString()
      }
    });
  }

  // Progresso de simulação de KDS em dev: se pedido está em RECEBIDO há mais de 10s, avança para EM_PREPARO
  const createdTime = new Date(order.createdAt).getTime();
  const elapsedSec = (Date.now() - createdTime) / 1000;

  if (elapsedSec > 30 && order.status === 'PRONTO') {
    updateServerOrderStatus(orderId, 'ENTREGUE');
  } else if (elapsedSec > 15 && order.status === 'EM_PREPARO') {
    updateServerOrderStatus(orderId, 'PRONTO');
  } else if (elapsedSec > 5 && order.status === 'RECEBIDO') {
    updateServerOrderStatus(orderId, 'EM_PREPARO');
  }

  return json({
    success: true,
    source: 'memory',
    order: getServerOrderById(orderId)
  });
};
