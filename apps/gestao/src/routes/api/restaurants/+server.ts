import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  // Se o usuário não for SuperAdmin (tiver restaurantId vinculado), só pode listar seu próprio restaurante
  const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;

  try {
    const restaurants = await prisma.restaurant.findMany({
      where: isSuperAdmin ? undefined : { id: locals.user.restaurantId || '__NONE__' },
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { id: true, name: true, email: true, phone: true, role: true },
          take: 1
        },
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
      cnpj: r.cnpj || '',
      email: r.email || '',
      phone: r.phone || '',
      ownerName: r.users[0]?.name || 'Administrador',
      ownerPhone: r.phone || r.users[0]?.phone || '',
      plan: r.plan,
      planPriceCents: r.planPriceCents,
      status: r.status,
      vitrineUrl: `https://usecardap.com.br/${r.slug}`,
      createdAt: r.createdAt.toLocaleDateString('pt-BR'),
      totalOrdersMonth: 0,
      gmvMonthCents: 0
    }));

    return json({
      success: true,
      restaurants: formatted
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN' || locals.user.restaurantId) {
    return json({ success: false, error: 'Apenas o SuperAdmin pode criar novos estabelecimentos.' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const slug = (data.slug || data.name).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

    const plan = data.plan || 'PRO_DELIVERY';
    let planPriceCents = data.planPriceCents;
    if (!planPriceCents) {
      if (plan === 'BASIC') planPriceCents = 9900;
      else if (plan === 'PRO_DELIVERY') planPriceCents = 19900;
      else planPriceCents = 34900;
    }

    const created = await prisma.restaurant.create({
      data: {
        name: data.name.trim(),
        slug,
        category: data.category || 'Restaurante / Lanchonete',
        cnpj: data.cnpj?.trim() ? data.cnpj.trim() : null,
        phone: data.ownerPhone || data.phone || '',
        email: data.email || '',
        plan,
        planPriceCents,
        status: data.status || 'ATIVO',
        primaryColor: '#dc2626',
        secondaryColor: '#0f172a',
        accentColor: '#f59e0b',
        wahaSessionName: `rest_${slug}`
      }
    });

    return json({ success: true, restaurant: created });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN' || locals.user.restaurantId) {
    return json({ success: false, error: 'Apenas o SuperAdmin pode alterar o status ou plano de estabelecimentos.' }, { status: 403 });
  }

  try {
    const { id, status, plan, name, slug, category, cnpj, phone, email } = await request.json();

    const cleanSlug = slug ? slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-') : undefined;

    let planPriceCents = undefined;
    if (plan) {
      if (plan === 'BASIC') planPriceCents = 9900;
      else if (plan === 'PRO_DELIVERY') planPriceCents = 19900;
      else planPriceCents = 34900;
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(plan ? { plan, planPriceCents } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(cleanSlug ? { slug: cleanSlug } : {}),
        ...(category ? { category } : {}),
        ...(cnpj !== undefined ? { cnpj: cnpj?.trim() ? cnpj.trim() : null } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {})
      }
    });

    return json({ success: true, restaurant: updated });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN' || locals.user.restaurantId) {
    return json({ success: false, error: 'Apenas o SuperAdmin pode editar dados de estabelecimentos.' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id, name, slug, category, cnpj, phone, email, plan, status } = data;

    const cleanSlug = slug ? slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-') : undefined;

    let planPriceCents = undefined;
    if (plan) {
      if (plan === 'BASIC') planPriceCents = 9900;
      else if (plan === 'PRO_DELIVERY') planPriceCents = 19900;
      else planPriceCents = 34900;
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(cleanSlug ? { slug: cleanSlug } : {}),
        ...(category ? { category } : {}),
        ...(cnpj !== undefined ? { cnpj: cnpj?.trim() ? cnpj.trim() : null } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(plan ? { plan, planPriceCents } : {}),
        ...(status ? { status } : {})
      }
    });

    return json({ success: true, restaurant: updated });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN' || locals.user.restaurantId) {
    return json({ success: false, error: 'Apenas o SuperAdmin pode excluir estabelecimentos.' }, { status: 403 });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ success: false, error: 'ID do estabelecimento não fornecido.' }, { status: 400 });
  }

  try {
    // Exclusão segura em cascata
    await prisma.$transaction(async (tx) => {
      // Desvincular ou excluir colaboradores do restaurante
      await tx.user.deleteMany({ where: { restaurantId: id } });
      // Excluir o restaurante
      await tx.restaurant.delete({ where: { id } });
    });

    return json({ success: true, message: 'Estabelecimento excluído com sucesso.' });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
