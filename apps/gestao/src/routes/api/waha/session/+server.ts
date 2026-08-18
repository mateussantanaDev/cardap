import { json, type RequestHandler } from '@sveltejs/kit';
import { getWahaSessionStatus, startWahaSession } from '$lib/server/wahaClient';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const session = await getWahaSessionStatus();
  return json({
    success: true,
    session
  });
};

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const started = await startWahaSession();
  const session = await getWahaSessionStatus();
  return json({
    success: started,
    session
  });
};
