import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { Result } from '../../shared/Result';
import { DomainError } from '../../shared/DomainError';
import { randomBytes, randomUUID } from 'node:crypto';
import { UserRole } from '../../shared/SecurityGuard';

export interface AuthenticateUserInputDTO {
  email: string;
  password: string;
}

export interface AuthenticateUserOutputDTO {
  token: string;
  expiresAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super("E-mail ou senha incorretos.", "INVALID_CREDENTIALS");
  }
}

export class InactiveUserError extends DomainError {
  constructor() {
    super("Esta conta de usuário está inativa. Entre em contato com a gerência.", "INACTIVE_USER");
  }
}

export class AuthenticateUserUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(request: AuthenticateUserInputDTO): Promise<Result<AuthenticateUserOutputDTO, DomainError>> {
    if (!request.email || !request.password) {
      return Result.fail(new InvalidCredentialsError());
    }

    const cleanEmail = request.email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(cleanEmail);

    if (!user) {
      return Result.fail(new InvalidCredentialsError());
    }

    if (!user.isActive) {
      return Result.fail(new InactiveUserError());
    }

    const isPasswordValid = user.verifyPassword(request.password);
    if (!isPasswordValid) {
      return Result.fail(new InvalidCredentialsError());
    }

    // Criar Sessão Segura (Válida por 12 horas)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    await this.userRepo.createSession({
      id: randomUUID(),
      userId: user.id,
      token,
      expiresAt
    });

    return Result.ok({
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  }
}
