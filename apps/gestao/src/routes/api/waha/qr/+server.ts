import { json, type RequestHandler } from '@sveltejs/kit';
import { getWahaQrCode, getWahaSessionStatus } from '$lib/server/wahaClient';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const session = await getWahaSessionStatus();
  const qr = await getWahaQrCode();

  return json({
    success: true,
    sessionName: session.name,
    status: session.status,
    qrBase64: qr ? `data:${qr.mimetype};base64,${qr.data}` : null,
    me: session.me
  });
};
