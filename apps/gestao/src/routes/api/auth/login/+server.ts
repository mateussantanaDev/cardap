import { json, type RequestHandler } from '@sveltejs/kit';
import { AuthenticateUserUseCase } from '@cardap/core';
import { PrismaUserRepository } from '@cardap/database';

const userRepo = new PrismaUserRepository();
const authUseCase = new AuthenticateUserUseCase(userRepo);

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return json({ success: false, error: 'Por favor, informe o e-mail e a senha de acesso.' }, { status: 400 });
    }

    const authResult = await authUseCase.execute({ email, password });

    if (!authResult.isSuccess) {
      const err = authResult.getError();
      return json({ success: false, error: err.message || 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    const sessionData = authResult.getValue();

    // Gravar cookie seguro HTTP-Only para a sessão do ERP
    const isHttps = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
    cookies.set('cardap_session', sessionData.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });

    return json({
      success: true,
      user: sessionData.user
    });
  } catch (err: any) {
    return json({ success: false, error: `Erro ao realizar login: ${err.message}` }, { status: 500 });
  }
};
