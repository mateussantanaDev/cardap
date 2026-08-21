import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async () => {
  const baseUrl = process.env.PUBLIC_VITRINE_URL || 'https://usecardap.com.br';

  let restaurants: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    restaurants = await prisma.restaurant.findMany({
      select: {
        slug: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    });
  } catch (e) {
    restaurants = [{ slug: 'imperius-do-pastel', updatedAt: new Date() }];
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Página Inicial Marketplace -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Páginas de Restaurantes & Cardápios -->
  ${restaurants
    .map(
      r => `
  <url>
    <loc>${baseUrl}/${r.slug}</loc>
    <lastmod>${(r.updatedAt ? new Date(r.updatedAt) : new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join('')}
</urlset>`;

  return new Response(sitemapXml.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'max-age=3600, s-maxage=3600'
    }
  });
};
