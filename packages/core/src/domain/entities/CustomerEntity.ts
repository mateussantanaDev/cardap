import { Money } from '../value-objects/Money';

export interface CustomerProps {
  id: string;
  phone: string;
  name?: string;
  cpf?: string;
  email?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  totalOrdersCount?: number;
  totalSpentCents?: number;
  tags?: string[];
  lastOrderAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerEntity {
  private readonly _id: string;
  private _phone: string;
  private _name?: string;
  private _cpf?: string;
  private _email?: string;
  private _addressStreet?: string;
  private _addressNumber?: string;
  private _addressNeighborhood?: string;
  private _addressCity?: string;
  private _addressState?: string;
  private _totalOrdersCount: number;
  private _totalSpentCents: number;
  private _tags: string[];
  private _lastOrderAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CustomerProps) {
    if (!props.phone || props.phone.trim().length < 8) {
      throw new Error("Telefone/WhatsApp do cliente é obrigatório.");
    }

    this._id = props.id;
    this._phone = props.phone.replace(/\D/g, '');
    this._name = props.name;
    this._cpf = props.cpf;
    this._email = props.email;
    this._addressStreet = props.addressStreet;
    this._addressNumber = props.addressNumber;
    this._addressNeighborhood = props.addressNeighborhood;
    this._addressCity = props.addressCity;
    this._addressState = props.addressState;
    this._totalOrdersCount = props.totalOrdersCount || 0;
    this._totalSpentCents = props.totalSpentCents || 0;
    this._tags = props.tags ? [...props.tags] : [];
    this._lastOrderAt = props.lastOrderAt;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();

    this.recalculateTags();
  }

  public get id(): string { return this._id; }
  public get phone(): string { return this._phone; }
  public get name(): string { return this._name || 'Cliente WhatsApp'; }
  public get cpf(): string | undefined { return this._cpf; }
  public get email(): string | undefined { return this._email; }
  public get addressStreet(): string | undefined { return this._addressStreet; }
  public get addressNumber(): string | undefined { return this._addressNumber; }
  public get addressComplement(): string | undefined { return undefined; }
  public get addressNeighborhood(): string | undefined { return this._addressNeighborhood; }
  public get addressCity(): string | undefined { return this._addressCity; }
  public get addressState(): string | undefined { return this._addressState; }
  public get addressZipCode(): string | undefined { return undefined; }
  public get totalOrdersCount(): number { return this._totalOrdersCount; }
  public get totalSpentCents(): number { return this._totalSpentCents; }
  public get tags(): ReadonlyArray<string> { return [...this._tags]; }
  public get lastOrderAt(): Date | undefined { return this._lastOrderAt; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  public get formattedPhone(): string {
    const raw = this._phone;
    if (raw.length === 11) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    if (raw.length === 13 && raw.startsWith('55')) {
      return `(${raw.slice(2, 4)}) ${raw.slice(4, 9)}-${raw.slice(9)}`;
    }
    return raw;
  }

  public get lifetimeValue(): Money {
    return Money.fromCents(this._totalSpentCents);
  }

  public get averageTicket(): Money {
    if (this._totalOrdersCount <= 0) return Money.zero();
    return Money.fromCents(Math.round(this._totalSpentCents / this._totalOrdersCount));
  }

  /**
   * Recalcula automaticamente as etiquetas do cliente com base no LTV e recorrência de compras.
   */
  public recalculateTags(): void {
    const currentTags = new Set(this._tags);

    if (this._totalSpentCents >= 20000) { // R$ 200,00+
      currentTags.add('VIP');
    }
    if (this._totalOrdersCount >= 3) {
      currentTags.add('RECORRENTE');
    }
    if (this._totalOrdersCount <= 1) {
      currentTags.add('NOVO');
    }

    this._tags = Array.from(currentTags);
  }

  public registerPurchase(spentCents: number): void {
    this._totalOrdersCount += 1;
    this._totalSpentCents += spentCents;
    this._lastOrderAt = new Date();
    this._updatedAt = new Date();
    this.recalculateTags();
  }
}
