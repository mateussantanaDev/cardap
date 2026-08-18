import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async () => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    const formatted = restaurants.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      cnpj: r.cnpj || '52.894.103/0001-88',
      ownerName: 'Mateus Vieira',
      ownerPhone: r.phone || '(87) 99812-3456',
      plan: r.plan,
      planPriceCents: r.planPriceCents,
      status: r.status,
      vitrineUrl: `http://localhost:3001/${r.slug}`,
      createdAt: r.createdAt.toLocaleDateString('pt-BR'),
      totalOrdersMonth: 124,
      gmvMonthCents: 485000
    }));

    return json({
      success: true,
      restaurants: formatted
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created = await prisma.restaurant.create({
      data: {
        name: data.name,
        slug,
        category: data.category || 'Restaurante / Lanchonete',
        cnpj: data.cnpj,
        phone: data.ownerPhone || data.phone,
        plan: data.plan || 'PRO_DELIVERY',
        planPriceCents: data.planPriceCents || 19900,
        status: 'ATIVO'
      }
    });

    return json({ success: true, restaurant: created });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { id, status, plan } = await request.json();
    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(plan ? { plan } : {})
      }
    });
    return json({ success: true, restaurant: updated });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
