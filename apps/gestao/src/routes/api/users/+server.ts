import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async () => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    const formattedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, email, phone, role, password } = await request.json();
    const created = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: role || 'CAIXA',
        passwordHash: '$2b$10$defaultHashForNewRealUser2026',
        isActive: true
      }
    });

    return json({ success: true, user: created });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { id, isActive, role } = await request.json();
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(role ? { role } : {})
      }
    });
    return json({ success: true, user: updated });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
