import { ICouponRepository, CouponData } from '@cardap/core';
import { prisma } from '../client.js';

export class PrismaCouponRepository implements ICouponRepository {
  async findByCode(code: string): Promise<CouponData | null> {
    const raw = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!raw) return null;

    return {
      id: raw.id,
      code: raw.code,
      description: raw.description || undefined,
      discountType: raw.discountType as any,
      discountValue: Number(raw.discountValue),
      minOrderValueCents: raw.minOrderValue ? Math.round(Number(raw.minOrderValue) * 100) : undefined,
      maxDiscountValueCents: raw.maxDiscountValue ? Math.round(Number(raw.maxDiscountValue) * 100) : undefined,
      startDate: raw.startDate,
      endDate: raw.endDate,
      usageLimit: raw.usageLimit || undefined,
      currentUsages: raw.currentUsages,
      isActive: raw.isActive
    };
  }

  async incrementUsage(id: string): Promise<void> {
    await prisma.coupon.update({
      where: { id },
      data: { currentUsages: { increment: 1 } }
    });
  }
}
