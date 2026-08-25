import { prisma } from '@cardap/database';
import { realtimeBus, type RealtimeEventPayload } from '$lib/server/realtimeBus';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request, getClientAddress }) => {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Token de dispositivo ausente.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Valida se o token pertence a um terminal registrado no banco
  let device = await prisma.printerDevice.findUnique({
    where: { token },
    include: { restaurant: true }
  });

  if (!device) {
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
          const targetSector = orderData?.sector || 'TODOS';

          // Valida se o setor deste dispositivo bate com o pedido
          const isAllowed =
            !device?.allowedSectors ||
            device.allowedSectors.includes('TODOS') ||
            device.allowedSectors.includes(targetSector);

          if (!isAllowed) return;

          let textContent = orderData?.receiptText || orderData?.content || '';
          if (!textContent && orderData?.items) {
            const isKitchen = targetSector === 'COZINHA';
            const lines: string[] = [];
            lines.push('================================================');
            lines.push(isKitchen ? '         *** COMANDA DE PRODUÇÃO ***            ' : '               CARDAP ERP & PDV                 ');
            lines.push('================================================');
            lines.push(`PEDIDO: #${orderData.orderNumber || ''}   TIPO: ${orderData.type || 'BALCAO'}`);
            if (orderData.tableNumber) lines.push(`MESA: ${orderData.tableNumber}`);
            if (orderData.customerName) lines.push(`CLIENTE: ${orderData.customerName}`);
            lines.push(`HORA: ${new Date().toLocaleTimeString('pt-BR')}`);
            lines.push('------------------------------------------------');
            lines.push('QTD ITEM');
            lines.push('------------------------------------------------');
            for (const it of orderData.items || []) {
              lines.push(`${it.quantity}x ${it.productName || it.name || ''}`);
              if (it.notes) lines.push(`   OBS: ${it.notes}`);
              if (it.assemblies) for (const a of it.assemblies) lines.push(`   + ${a.name}`);
              if (it.modifiers) for (const m of it.modifiers) lines.push(`   * ${m.name}`);
              if (it.complements) for (const c of it.complements) lines.push(`   + ${c.name}`);
            }
            lines.push('================================================');
            lines.push('\n\n\n');
            textContent = lines.join('\n');
          }

          const sseFormatted = `event: PRINT_JOB\ndata: ${JSON.stringify({
            type: 'PRINT_JOB',
            jobId: eventPayload.id,
            sector: targetSector,
            content: textContent,
            orderNumber: orderData?.orderNumber,
            timestamp: eventPayload.timestamp
          })}\n\n`;

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
