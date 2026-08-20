import { redirect, type Handle } from '@sveltejs/kit';
import { PrismaUserRepository } from '@cardap/database';

const userRepo = new PrismaUserRepository();

export const handle: Handle = async ({ event, resolve }) => {
  // CORS para permitir requisições da Vitrine na Vercel
  const origin = event.request.headers.get('origin') || '';
  const isAllowedOrigin = origin.includes('vercel.app') || origin.includes('cardcap') || origin.includes('localhost');

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
      if (sessionResult) {
        event.locals.user = {
          id: sessionResult.user.id,
          name: sessionResult.user.name,
          email: sessionResult.user.email,
          role: sessionResult.user.role
        };
      }
    } catch {
      // Fallback em caso de banco offline
    }

    // Se a sessão for um token de demonstração/desenvolvimento válido
    if (!event.locals.user && sessionToken.startsWith('demo_session_')) {
      const roleMatch = sessionToken.match(/demo_session_(ADMIN|GERENTE|CAIXA|GARCOM|COZINHA)/);
      const role = roleMatch ? roleMatch[1] : 'ADMIN';
      const targetEmail = `${role.toLowerCase()}@imperiusdopastel.com.br`;

      try {
        const dbUser = await userRepo.findByEmail(targetEmail);
        if (dbUser) {
          event.locals.user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role
          };
        }
      } catch {}

      if (!event.locals.user) {
        event.locals.user = {
          id: `usr-${role.toLowerCase()}-01`,
          name: role === 'COZINHA' ? 'Chef Lucas (Cozinha KDS)' : role === 'CAIXA' ? 'Carlos Operador de Caixa' : 'Mateus Vieira (Administrador)',
          email: targetEmail,
          role: role as any
        };
      }
    }
  } else {
    event.locals.user = null;
  }

  // Proteção RBAC de Rotas da Gestão ERP (/gestao/*)
  const isGestaoRoute = event.url.pathname.startsWith('/gestao');
  const isApiRoute = event.url.pathname.startsWith('/api');

  if (isGestaoRoute && !event.locals.user) {
    throw redirect(303, `/login?redirect=${encodeURIComponent(event.url.pathname)}`);
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
