import { describe, it, expect } from 'vitest';
import { AuthenticateUserUseCase } from '../src/use-cases/auth/AuthenticateUserUseCase';
import { UserEntity } from '../src/domain/entities/UserEntity';
import { IUserRepository, UserSessionData } from '../src/domain/repositories/IUserRepository';

class InMemoryUserRepository implements IUserRepository {
  private users: UserEntity[] = [];
  private sessions: UserSessionData[] = [];

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.find(u => u.email === email.toLowerCase().trim()) || null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async save(user: UserEntity): Promise<void> {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) this.users[idx] = user;
    else this.users.push(user);
  }

  async createSession(session: UserSessionData): Promise<void> {
    this.sessions.push(session);
  }

  async findSessionByToken(token: string): Promise<{ user: UserEntity; expiresAt: Date } | null> {
    const session = this.sessions.find(s => s.token === token);
    if (!session || session.expiresAt < new Date()) return null;
    const user = await this.findById(session.userId);
    if (!user) return null;
    return { user, expiresAt: session.expiresAt };
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions = this.sessions.filter(s => s.token !== token);
  }
}

describe('Caso de Uso: AuthenticateUserUseCase', () => {
  it('deve autenticar com sucesso um usuário com credenciais válidas e gerar token de 30 dias', async () => {
    const repo = new InMemoryUserRepository();

    const hashedPassword = UserEntity.hashPassword('senhaSegura123');
    const user = new UserEntity({
      id: 'user-admin-1',
      name: 'Operador Imperius',
      email: 'admin@imperius.com.br',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      isActive: true
    });

    await repo.save(user);

    const useCase = new AuthenticateUserUseCase(repo);
    const result = await useCase.execute({
      email: 'admin@imperius.com.br',
      password: 'senhaSegura123'
    });

    expect(result.isSuccess).toBe(true);
    const data = result.getValue();
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe('ADMIN');
    expect(data.user.email).toBe('admin@imperius.com.br');

    // Verificar se a sessão foi gravada no repositório
    const sessionCheck = await repo.findSessionByToken(data.token);
    expect(sessionCheck).not.toBeNull();
    expect(sessionCheck?.user.name).toBe('Operador Imperius');
  });

  it('deve rejeitar tentativa de login com senha incorreta', async () => {
    const repo = new InMemoryUserRepository();
    const hashedPassword = UserEntity.hashPassword('senhaCorreta123');
    const user = new UserEntity({
      id: 'user-caixa-1',
      name: 'Caixa 01',
      email: 'caixa@imperius.com.br',
      passwordHash: hashedPassword,
      role: 'CAIXA',
      isActive: true
    });
    await repo.save(user);

    const useCase = new AuthenticateUserUseCase(repo);
    const result = await useCase.execute({
      email: 'caixa@imperius.com.br',
      password: 'senhaErrada999'
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError().message).toContain('incorretos');
  });

  it('deve bloquear login de usuários inativos', async () => {
    const repo = new InMemoryUserRepository();
    const hashedPassword = UserEntity.hashPassword('senhaSegura123');
    const user = new UserEntity({
      id: 'user-inativo',
      name: 'Funcionario Desligado',
      email: 'desligado@imperius.com.br',
      passwordHash: hashedPassword,
      role: 'GARCOM',
      isActive: false // Inativo!
    });
    await repo.save(user);

    const useCase = new AuthenticateUserUseCase(repo);
    const result = await useCase.execute({
      email: 'desligado@imperius.com.br',
      password: 'senhaSegura123'
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError().message).toContain('inativa');
  });
});
