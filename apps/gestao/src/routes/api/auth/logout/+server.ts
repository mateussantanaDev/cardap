import { json, type RequestHandler } from '@sveltejs/kit';
import { PrismaUserRepository } from '@cardap/database';

const userRepo = new PrismaUserRepository();

export const POST: RequestHandler = async ({ cookies }) => {
  const sessionToken = cookies.get('cardap_session');
  if (sessionToken) {
    await userRepo.deleteSession(sessionToken).catch(() => {});
    cookies.delete('cardap_session', { path: '/' });
  }

  return json({ success: true, message: 'Sessão encerrada com sucesso.' });
};
