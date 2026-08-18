import { json, type RequestHandler } from '@sveltejs/kit';
import { logoutWahaSession, getWahaSessionStatus } from '$lib/server/wahaClient';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const loggedOut = await logoutWahaSession();
  const session = await getWahaSessionStatus();

  return json({
    success: loggedOut,
    session
  });
};
