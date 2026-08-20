import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return json({ success: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      if (!file.type.startsWith('image/')) {
        return json({ success: false, error: 'O arquivo deve ser uma imagem (PNG, JPG, WEBP, SVG).' }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return json({ success: false, error: 'A imagem não pode ultrapassar 5MB.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

      return json({
        success: true,
        url: base64,
        filename: file.name,
        size: file.size,
        mimeType: file.type
      });
    }

    if (contentType.includes('application/json')) {
      const { base64Data, filename } = await request.json();
      if (!base64Data || !base64Data.startsWith('data:image/')) {
        return json({ success: false, error: 'Formato de imagem base64 inválido.' }, { status: 400 });
      }

      return json({
        success: true,
        url: base64Data,
        filename: filename || 'upload.png'
      });
    }

    return json({ success: false, error: 'Content-Type inválido.' }, { status: 400 });
  } catch (err: any) {
    return json({ success: false, error: `Erro no upload: ${err.message}` }, { status: 500 });
  }
};
