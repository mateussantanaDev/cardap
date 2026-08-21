import { json, type RequestHandler } from '@sveltejs/kit';
import { restartWahaSession, getWahaSessionStatus } from '$lib/server/wahaClient';
import { prisma } from '@cardap/database';

export const POST: RequestHandler = async ({ locals, url, request }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  let bodyData: any = {};
  try {
    bodyData = await request.json();
  } catch {}

  const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;
  const targetId = isSuperAdmin
    ? (bodyData.restaurantId || url.searchParams.get('restaurantId') || undefined)
    : (locals.user.restaurantId || '__NONE__');

  let sessionName = bodyData.sessionName || 'default';

  try {
    const restaurant = targetId
      ? await prisma.restaurant.findUnique({ where: { id: targetId } })
      : await prisma.restaurant.findFirst();

    if (restaurant) {
      sessionName = bodyData.sessionName || restaurant.wahaSessionName || `rest_${restaurant.slug}`;
    }
  } catch (err) {
    console.warn('Erro ao obter restaurante para restart WAHA:', err);
  }

  const restarted = await restartWahaSession(sessionName);
  const session = await getWahaSessionStatus(sessionName);

  return json({
    success: restarted,
    session
  });
};
