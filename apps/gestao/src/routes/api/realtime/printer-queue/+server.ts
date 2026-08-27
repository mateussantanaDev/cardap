import { prisma } from '@cardap/database';
import { realtimeBus, type RealtimeEventPayload } from '$lib/server/realtimeBus';
import { PrinterService } from '$lib/services/printerService';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request, url, getClientAddress }) => {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    token = request.headers.get('x-token')?.trim() || url.searchParams.get('token')?.trim() || '';
  }

  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Token de dispositivo ausente.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Valida se o token pertence a um terminal registrado no banco
  let device = await prisma.printerDevice.findFirst({
    where: {
      token: {
        equals: token,
        mode: 'insensitive'
      }
    },
    include: { restaurant: true }
  });

  if (!device) {
    console.warn(`[PrinterQueue SSE] Tentativa de conexão com token desconhecido: "${token.substring(0, 12)}..."`);
    return new Response(JSON.stringify({ success: false, error: 'Token de dispositivo inválido ou revogado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const deviceId = device.id;
  const restaurantId = device.restaurantId;
  let clientIp = '';
  try {
    clientIp = getClientAddress();
  } catch {}

  // Atualiza status do dispositivo para ONLINE
  try {
    await prisma.printerDevice.update({
      where: { id: deviceId },
      data: {
        status: 'ONLINE',
        lastPingAt: new Date(),
        ipAddress: clientIp || undefined
      }
    });
  } catch (err) {
    console.error('[PrinterQueue SSE] Erro ao atualizar status do device:', err);
  }

  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (data: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          isClosed = true;
        }
      };

      // Boas-vindas
      safeEnqueue(`event: connected\ndata: ${JSON.stringify({
        message: 'Cardap Print Agent conectado com sucesso!',
        restaurantId: device?.restaurantId,
        restaurantName: device?.restaurant.name,
        deviceName: device?.name
      })}\n\n`);

      // Escuta eventos do RealtimeBus
      const unsubscribe = realtimeBus.subscribe(async (eventPayload: RealtimeEventPayload) => {
        if (isClosed) return;

        // Filtra apenas eventos do restaurante deste dispositivo
        if (eventPayload.data?.restaurantId && eventPayload.data.restaurantId !== restaurantId) {
          return;
        }

        // Se for um evento de novo pedido criado ou solicitação de impressão
        if (eventPayload.topic === 'ORDER_EVENT' || eventPayload.type === 'PRINT_ORDER') {
          const orderData = eventPayload.data;
          const targetSector = (orderData?.sector || 'TODOS').toUpperCase();

          const allowedSectors = (device?.allowedSectors || ['TODOS']).map((s: string) => s.toUpperCase());
          const isAllowed =
            allowedSectors.length === 0 ||
            allowedSectors.includes('TODOS') ||
            targetSector === 'TODOS' ||
            allowedSectors.includes(targetSector);

          if (!isAllowed) {
            console.log(`[PrinterQueue SSE] Ignorando evento setor ${targetSector} para terminal ${device?.name} (Setores permitidos: ${allowedSectors.join(', ')})`);
            return;
          }

          let textContent = orderData?.receiptText || orderData?.content || '';
          if (!textContent && orderData?.items) {
            const isStrictKitchen = targetSector === 'COZINHA' && orderData.type !== 'DELIVERY';
            textContent = isStrictKitchen
              ? PrinterService.generateKitchenReceiptText(orderData as any)
              : PrinterService.generateReceiptText(orderData as any);
          }

          const sseFormatted = `event: PRINT_JOB\ndata: ${JSON.stringify({
            type: 'PRINT_JOB',
            jobId: eventPayload.id,
            sector: targetSector,
            content: textContent,
            orderNumber: orderData?.orderNumber,
            timestamp: eventPayload.timestamp
          })}\n\n`;

          console.log(`[PrinterQueue SSE] 🖨️ Despachando PRINT_JOB para terminal "${device?.name}" | Pedido #${orderData?.orderNumber}`);
          safeEnqueue(sseFormatted);
        }
      });

      // Heartbeat a cada 20 segundos
      const heartbeatInterval = setInterval(async () => {
        if (isClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        safeEnqueue(': ping\n\n');

        // Atualiza lastPing no banco
        try {
          await prisma.printerDevice.update({
            where: { id: deviceId },
            data: { lastPingAt: new Date(), status: 'ONLINE' }
          });
        } catch {}
      }, 20000);

      // Tratamento de desconexão
      request.signal.addEventListener('abort', async () => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        unsubscribe();

        try {
          controller.close();
        } catch {}

        try {
          await prisma.printerDevice.update({
            where: { id: deviceId },
            data: { status: 'OFFLINE' }
          });
          console.log(`[PrinterQueue SSE] Dispositivo "${device?.name}" (${deviceId}) desconectado.`);
        } catch {}
      });
    },
    cancel() {
      isClosed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado: usuário não autenticado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const restaurantId = locals.user.restaurantId || (await prisma.restaurant.findFirst())?.id;

    const sector = (body.sector || 'TODOS').toUpperCase();
    const orderData = body.order || body;

    // Publica o evento de impressão no RealtimeBus
    realtimeBus.publish({
      type: 'PRINT_ORDER',
      data: {
        ...orderData,
        restaurantId,
        sector,
        receiptText: body.content || body.receiptText
      }
    });

    // Verifica quantos dispositivos online existem para feedback
    const onlineDevices = await prisma.printerDevice.count({
      where: {
        restaurantId: restaurantId || undefined,
        status: 'ONLINE'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      via: 'CLOUD_AGENT',
      onlineDevices,
      message: onlineDevices > 0
        ? `Trabalho de impressão despachado para ${onlineDevices} terminal(is) conectado(s)!`
        : 'Trabalho de impressão despachado para a fila de nuvem.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[PrinterQueue POST Error]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
