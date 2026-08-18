import { Result } from '../../shared/Result';
import { DomainError, InvalidCatalogError } from '../../shared/DomainError';

export interface CouponData {
  id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTUAL' | 'VALOR_FIXO';
  discountValue: number; // Porcentagem (ex: 10) ou valor em R$ (ex: 15.00)
  minOrderValueCents?: number;
  maxDiscountValueCents?: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  currentUsages: number;
  isActive: boolean;
}

export interface ICouponRepository {
  findByCode(code: string): Promise<CouponData | null>;
  incrementUsage(id: string): Promise<void>;
}

export interface ValidateCouponInputDTO {
  code: string;
  subtotalCents: number;
}

export interface ValidateCouponOutputDTO {
  valid: boolean;
  couponId: string;
  code: string;
  discountType: 'PERCENTUAL' | 'VALOR_FIXO';
  discountCents: number;
  finalTotalCents: number;
  message: string;
}

export class ValidateCouponUseCase {
  constructor(private couponRepo: ICouponRepository) {}

  async execute(request: ValidateCouponInputDTO): Promise<Result<ValidateCouponOutputDTO, DomainError>> {
    const cleanCode = request.code.trim().toUpperCase();
    const coupon = await this.couponRepo.findByCode(cleanCode);

    if (!coupon) {
      return Result.fail(new InvalidCatalogError(`Cupom '${cleanCode}' não encontrado ou inválido.`));
    }

    if (!coupon.isActive) {
      return Result.fail(new InvalidCatalogError(`Cupom '${cleanCode}' está inativo.`));
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return Result.fail(new InvalidCatalogError(`Cupom '${cleanCode}' expirou ou ainda não está vigente.`));
    }

    if (coupon.usageLimit && coupon.currentUsages >= coupon.usageLimit) {
      return Result.fail(new InvalidCatalogError(`Cupom '${cleanCode}' atingiu o limite máximo de utilizações.`));
    }

    if (coupon.minOrderValueCents && request.subtotalCents < coupon.minOrderValueCents) {
      const minFmt = (coupon.minOrderValueCents / 100).toFixed(2).replace('.', ',');
      return Result.fail(new InvalidCatalogError(`Cupom '${cleanCode}' requer valor mínimo de pedido de R$ ${minFmt}.`));
    }

    let discountCents = 0;
    if (coupon.discountType === 'PERCENTUAL') {
      discountCents = Math.round((request.subtotalCents * coupon.discountValue) / 100);
      if (coupon.maxDiscountValueCents && discountCents > coupon.maxDiscountValueCents) {
        discountCents = coupon.maxDiscountValueCents;
      }
    } else {
      // VALOR_FIXO
      discountCents = Math.round(coupon.discountValue * 100);
    }

    // O desconto não pode exceder o subtotal
    discountCents = Math.min(discountCents, request.subtotalCents);
    const finalTotalCents = Math.max(0, request.subtotalCents - discountCents);

    return Result.ok({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountCents,
      finalTotalCents,
      message: `Cupom '${coupon.code}' aplicado com sucesso!`
    });
  }
}
