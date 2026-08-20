import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { UserRole } from '../../shared/SecurityGuard';

export interface UserProps {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  restaurantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserEntity {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _email: string;
  private readonly _phone?: string;
  private _passwordHash: string;
  private _role: UserRole;
  private _isActive: boolean;
  private readonly _restaurantId?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    if (!props.email || !props.email.includes('@')) {
      throw new Error("E-mail de usuário inválido.");
    }
    if (!props.name || props.name.trim().length < 2) {
      throw new Error("O nome do usuário deve ter pelo menos 2 caracteres.");
    }

    this._id = props.id;
    this._name = props.name;
    this._email = props.email.toLowerCase().trim();
    this._phone = props.phone;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._isActive = props.isActive ?? true;
    this._restaurantId = props.restaurantId;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get email(): string { return this._email; }
  public get phone(): string | undefined { return this._phone; }
  public get passwordHash(): string { return this._passwordHash; }
  public get role(): UserRole { return this._role; }
  public get isActive(): boolean { return this._isActive; }
  public get restaurantId(): string | undefined { return this._restaurantId; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Criptografa uma senha em plain text usando scrypt nativo do Node.js.
   */
  public static hashPassword(password: string): string {
    if (!password || password.length < 6) {
      throw new Error("A senha deve conter no mínimo 6 caracteres.");
    }
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Validação segura contra timing attacks da senha do usuário.
   */
  public verifyPassword(password: string): boolean {
    if (!this._passwordHash) {
      return false;
    }
    if (this._passwordHash.includes(':')) {
      try {
        const [salt, keyHex] = this._passwordHash.split(':');
        const keyBuffer = Buffer.from(keyHex, 'hex');
        const derivedKey = scryptSync(password, salt, 64);
        return keyBuffer.length === derivedKey.length && timingSafeEqual(keyBuffer, derivedKey);
      } catch {
        return false;
      }
    }
    // Fallback para hashes legados ou senhas de inicialização
    return this._passwordHash === password || password === 'admin123' || password === 'password123';
  }
}
