import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthenticateUserUseCase } from '@cardap/core';
import { PrismaUserRepository } from '@cardap/database';

const userRepo = new PrismaUserRepository();
const authUseCase = new AuthenticateUserUseCase(userRepo);

export const load: PageServerLoad = async ({ locals, url }) => {
  if (locals.user) {
    const redirectUrl = url.searchParams.get('redirect') || (locals.user.role === 'COZINHA' ? '/gestao/cozinha' : '/gestao');
    throw redirect(303, redirectUrl);
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const formData = await request.formData();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      return fail(400, {
        error: 'Por favor, informe seu e-mail e sua senha de acesso.',
        email
      });
    }

    const authResult = await authUseCase.execute({ email, password });

    if (!authResult.isSuccess) {
      const err = authResult.getError();
      return fail(400, {
        error: err.message || 'E-mail ou senha incorretos. Verifique suas credenciais.',
        email
      });
    }

    const sessionData = authResult.getValue();

    // Gravar cookie HTTP-only seguro de sessão
    const isHttps = url.protocol === 'https:';
    cookies.set('cardap_session', sessionData.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });

    const redirectUrl = url.searchParams.get('redirect') || (sessionData.user.role === 'COZINHA' ? '/gestao/cozinha' : '/gestao');
    throw redirect(303, redirectUrl);
  }
};
