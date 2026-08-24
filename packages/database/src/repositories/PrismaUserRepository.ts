import { IUserRepository, UserEntity, UserSessionData, UserRole } from '@cardap/core';
import { prisma } from '../client';

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    const raw = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!raw) return null;

    return new UserEntity({
      id: raw.id,
      name: raw.name,
      email: raw.email,
      phone: raw.phone || undefined,
      passwordHash: raw.passwordHash,
      role: raw.role as UserRole,
      isActive: raw.isActive,
      restaurantId: raw.restaurantId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    const raw = await prisma.user.findUnique({
      where: { id }
    });

    if (!raw) return null;

    return new UserEntity({
      id: raw.id,
      name: raw.name,
      email: raw.email,
      phone: raw.phone || undefined,
      passwordHash: raw.passwordHash,
      role: raw.role as UserRole,
      isActive: raw.isActive,
      restaurantId: raw.restaurantId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    });
  }

  async save(user: UserEntity): Promise<void> {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        restaurantId: user.restaurantId
      },
      update: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        restaurantId: user.restaurantId
      }
    });
  }

  async createSession(session: UserSessionData): Promise<void> {
    await prisma.userSession.create({
      data: {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt
      }
    });
  }

  async findSessionByToken(token: string): Promise<{ user: UserEntity; expiresAt: Date } | null> {
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        // Limpar sessão expirada
        await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      }
      return null;
    }

    // Se a sessão for válida e tiver menos de 15 dias restantes, renovar automaticamente por mais 30 dias
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    if (session.expiresAt < fifteenDaysFromNow) {
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      prisma.userSession.update({
        where: { id: session.id },
        data: { expiresAt: newExpiresAt }
      }).catch(() => {});
    }

    const userEntity = new UserEntity({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone || undefined,
      passwordHash: session.user.passwordHash,
      role: session.user.role as UserRole,
      isActive: session.user.isActive,
      restaurantId: session.user.restaurantId || undefined,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt
    });

    return {
      user: userEntity,
      expiresAt: session.expiresAt
    };
  }

  async deleteSession(token: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { token }
    });
  }
}
