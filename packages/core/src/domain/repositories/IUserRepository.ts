import { UserEntity } from '../entities/UserEntity';

export interface UserSessionData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<void>;
  createSession(session: UserSessionData): Promise<void>;
  findSessionByToken(token: string): Promise<{ user: UserEntity; expiresAt: Date } | null>;
  deleteSession(token: string): Promise<void>;
}
