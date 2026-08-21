import { redirect, type Handle } from '@sveltejs/kit';
import { PrismaUserRepository } from '@cardap/database';

const userRepo = new PrismaUserRepository();

export const handle: Handle = async ({ event, resolve }) => {
  // CORS para permitir requisições da Vitrine
  const origin = event.request.headers.get('origin') || '';
  const isAllowedOrigin = origin.includes('usecardap.com.br') || origin.includes('vercel.app') || origin.includes('localhost');

  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, cardap_session',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const sessionToken = event.cookies.get('cardap_session');

  if (sessionToken) {
    try {
      const sessionResult = await userRepo.findSessionByToken(sessionToken);
      if (sessionResult && sessionResult.user && sessionResult.user.isActive) {
        event.locals.user = {
          id: sessionResult.user.id,
          name: sessionResult.user.name,
          email: sessionResult.user.email,
          role: sessionResult.user.role,
          restaurantId: sessionResult.user.restaurantId || null
        };
      } else {
        // Sessão inválida ou expirada: limpar cookie
        event.cookies.delete('cardap_session', { path: '/' });
        event.locals.user = null;
      }
    } catch (err) {
      console.warn('Erro ao validar sessão no banco:', err);
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  // Proteção Estrita de Rotas da Gestão ERP (/ e /gestao/*)
  const isGestaoRoute = event.url.pathname === '/' || event.url.pathname.startsWith('/gestao');
  const isApiRoute = event.url.pathname.startsWith('/api');

  if (isGestaoRoute && !event.locals.user) {
    throw redirect(303, `/login?redirect=${encodeURIComponent(event.url.pathname === '/' ? '/gestao' : event.url.pathname)}`);
  }

  const isPublicApiRoute = event.url.pathname.startsWith('/api/auth/login') ||
    event.url.pathname.startsWith('/api/waha/webhook') ||
    event.url.pathname.startsWith('/api/crm/webhook');

  if (isApiRoute && !isPublicApiRoute && !event.locals.user) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado: faça login no ERP para continuar.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const response = await resolve(event);
  if (isApiRoute && isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
};
