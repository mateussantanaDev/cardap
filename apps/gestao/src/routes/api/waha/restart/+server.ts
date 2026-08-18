import { json, type RequestHandler } from '@sveltejs/kit';
import { restartWahaSession, getWahaSessionStatus } from '$lib/server/wahaClient';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const restarted = await restartWahaSession();
  const session = await getWahaSessionStatus();

  return json({
    success: restarted,
    session
  });
};
