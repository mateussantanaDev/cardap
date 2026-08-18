import { realtimeBus, type RealtimeEventPayload } from '@cardap/realtime';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado: faça login no ERP.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Enviar mensagem de boas-vindas / conexão estabelecida
      const initialMsg = `event: connected\ndata: ${JSON.stringify({ message: 'Conexão Realtime SSE Estabelecida', userId: locals.user?.id })}\n\n`;
      controller.enqueue(encoder.encode(initialMsg));

      // Ouvinte de eventos do RealtimeBus
      const unsubscribe = realtimeBus.subscribe((eventPayload: RealtimeEventPayload) => {
        try {
          const sseFormatted = `event: ${eventPayload.topic}\ndata: ${JSON.stringify(eventPayload)}\n\n`;
          controller.enqueue(encoder.encode(sseFormatted));
        } catch (err) {
          console.error('[SSE STREAM] Erro ao enviar evento para o cliente:', err);
        }
      });

      // Heartbeat a cada 15 segundos para manter a conexão SSE ativa
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Limpeza quando a conexão for encerrada pelo cliente
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
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
