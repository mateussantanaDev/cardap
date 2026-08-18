import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, authenticated: false, user: null }, { status: 401 });
  }

  return json({
    success: true,
    authenticated: true,
    user: locals.user
  });
};
