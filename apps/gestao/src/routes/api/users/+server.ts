import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { UserEntity } from '@cardap/core';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;
  const targetRestaurantId = isSuperAdmin ? url.searchParams.get('restaurantId') : locals.user.restaurantId;

  try {
    const users = await prisma.user.findMany({
      where: isSuperAdmin
        ? (targetRestaurantId ? { restaurantId: targetRestaurantId } : undefined)
        : {
            restaurantId: locals.user.restaurantId || '__NONE__',
            // Gestores de restaurante nunca devem ver o SuperAdmin (que tem restaurantId null)
            NOT: { restaurantId: null }
          },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        restaurantId: true,
        createdAt: true
      }
    });

    const formattedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      roleLabel: u.role === 'ADMIN' ? 'Administrador / Gerente' : u.role === 'CAIXA' ? 'Operador de Caixa' : u.role === 'COZINHA' ? 'Chef de Cozinha / KDS' : 'Atendente de Salão',
      status: u.isActive ? 'ATIVO' : 'SUSPENSO',
      lastAccess: 'Hoje'
    }));

    return json({
      success: true,
      users: formattedUsers
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { name, email, phone, role, password, restaurantId } = await request.json();

    const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;
    const finalRestaurantId = isSuperAdmin ? (restaurantId || null) : (locals.user.restaurantId || null);

    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail || !name) {
      return json({ success: false, error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return json({ success: false, error: 'Já existe um usuário cadastrado com este e-mail.' }, { status: 400 });
    }

    const passwordHash = password ? UserEntity.hashPassword(password) : UserEntity.hashPassword('admin123');

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone || null,
        role: role || 'CAIXA',
        passwordHash,
        isActive: true,
        restaurantId: finalRestaurantId
      }
    });

    return json({
      success: true,
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        status: created.isActive ? 'ATIVO' : 'SUSPENSO'
      }
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { id, isActive, role, password, name, phone } = await request.json();

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Gestores só podem alterar colaboradores da sua própria loja
    const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;
    if (!isSuperAdmin && targetUser.restaurantId !== locals.user.restaurantId) {
      return json({ success: false, error: 'Acesso negado para modificar este usuário.' }, { status: 403 });
    }

    const passwordHash = password ? UserEntity.hashPassword(password) : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(role ? { role } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(passwordHash ? { passwordHash } : {})
      }
    });

    return json({ success: true, user: updated });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ success: false, error: 'ID do usuário não fornecido.' }, { status: 400 });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;
    if (!isSuperAdmin && targetUser.restaurantId !== locals.user.restaurantId) {
      return json({ success: false, error: 'Acesso negado para excluir este usuário.' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });
    return json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
