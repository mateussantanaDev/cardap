import { realtimeBus, type RealtimeEventPayload } from '@cardap/realtime';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado: faça login no ERP.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
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

      // Enviar mensagem inicial de conexão
      const initialMsg = `event: connected\ndata: ${JSON.stringify({ message: 'Conexão Realtime SSE Estabelecida', userId: locals.user?.id })}\n\n`;
      safeEnqueue(initialMsg);

      // Ouvinte de eventos do RealtimeBus
      const unsubscribe = realtimeBus.subscribe((eventPayload: RealtimeEventPayload) => {
        if (isClosed) return;
        const sseFormatted = `event: ${eventPayload.topic}\ndata: ${JSON.stringify(eventPayload)}\n\n`;
        safeEnqueue(sseFormatted);
      });

      // Heartbeat a cada 15 segundos para manter a conexão SSE ativa
      const heartbeatInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        safeEnqueue(': ping\n\n');
      }, 15000);

      // Limpeza quando a conexão for encerrada pelo cliente ou pelo navegador
      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
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
