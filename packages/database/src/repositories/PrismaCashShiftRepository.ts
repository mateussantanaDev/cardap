import { ICashShiftRepository, CashShiftEntity, CashTransaction, ShiftStatus } from '@cardap/core';
import { Money } from '@cardap/core';
import { prisma } from '../client.js';

export class PrismaCashShiftRepository implements ICashShiftRepository {
  async save(shift: CashShiftEntity): Promise<void> {
    const existing = await prisma.cashShift.findUnique({
      where: { id: shift.id },
      select: { id: true }
    });

    if (!existing) {
      await prisma.cashShift.create({
        data: {
          id: shift.id,
          openedByUserId: shift.openedByUserId,
          openedAt: shift.openedAt,
          initialAmount: shift.initialAmount.toDecimal(),
          status: shift.status,
          notes: shift.notes
        }
      });
    } else {
      await prisma.cashShift.update({
        where: { id: shift.id },
        data: {
          closedByUserId: shift.closedByUserId,
          closedAt: shift.closedAt,
          expectedFinalAmount: shift.expectedFinalAmount?.toDecimal(),
          actualFinalAmount: shift.actualFinalAmount?.toDecimal(),
          differenceAmount: shift.differenceAmount?.toDecimal(),
          status: shift.status as ShiftStatus,
          notes: shift.notes
        }
      });
    }

    // Persistir novas transações pendentes se houverem
    for (const tx of shift.transactions) {
      const txExists = await prisma.cashTransaction.findUnique({
        where: { id: tx.id },
        select: { id: true }
      });

      if (!txExists) {
        await prisma.cashTransaction.create({
          data: {
            id: tx.id,
            shiftId: shift.id,
            userId: tx.userId,
            orderId: tx.orderId,
            type: tx.type,
            amount: tx.amount.toDecimal(),
            description: tx.description,
            createdAt: tx.createdAt
          }
        });
      }
    }
  }

  async findById(id: string): Promise<CashShiftEntity | null> {
    const raw = await prisma.cashShift.findUnique({
      where: { id },
      include: { transactions: true }
    });

    if (!raw) return null;

    const domainTransactions = raw.transactions.map(
      tx =>
        new CashTransaction({
          id: tx.id,
          shiftId: tx.shiftId,
          userId: tx.userId,
          orderId: tx.orderId || undefined,
          type: tx.type,
          amount: Money.fromDecimal(tx.amount.toString()),
          description: tx.description,
          createdAt: tx.createdAt
        })
    );

    return new CashShiftEntity({
      id: raw.id,
      openedByUserId: raw.openedByUserId,
      closedByUserId: raw.closedByUserId || undefined,
      openedAt: raw.openedAt,
      closedAt: raw.closedAt || undefined,
      initialAmount: Money.fromDecimal(raw.initialAmount.toString()),
      actualFinalAmount: raw.actualFinalAmount ? Money.fromDecimal(raw.actualFinalAmount.toString()) : undefined,
      status: raw.status as ShiftStatus,
      notes: raw.notes || undefined,
      transactions: domainTransactions
    });
  }

  async findCurrentOpenShift(): Promise<CashShiftEntity | null> {
    const raw = await prisma.cashShift.findFirst({
      where: { status: 'ABERTO' },
      orderBy: { openedAt: 'desc' },
      include: { transactions: true }
    });

    if (!raw) return null;

    const domainTransactions = raw.transactions.map(
      tx =>
        new CashTransaction({
          id: tx.id,
          shiftId: tx.shiftId,
          userId: tx.userId,
          orderId: tx.orderId || undefined,
          type: tx.type,
          amount: Money.fromDecimal(tx.amount.toString()),
          description: tx.description,
          createdAt: tx.createdAt
        })
    );

    return new CashShiftEntity({
      id: raw.id,
      openedByUserId: raw.openedByUserId,
      openedAt: raw.openedAt,
      initialAmount: Money.fromDecimal(raw.initialAmount.toString()),
      status: 'ABERTO',
      notes: raw.notes || undefined,
      transactions: domainTransactions
    });
  }

  async findShiftsByDateRange(startDate: Date, endDate: Date): Promise<CashShiftEntity[]> {
    const rawShifts = await prisma.cashShift.findMany({
      where: {
        openedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { openedAt: 'desc' },
      include: { transactions: true }
    });

    return rawShifts.map(raw => {
      const domainTransactions = raw.transactions.map(
        tx =>
          new CashTransaction({
            id: tx.id,
            shiftId: tx.shiftId,
            userId: tx.userId,
            orderId: tx.orderId || undefined,
            type: tx.type,
            amount: Money.fromDecimal(tx.amount.toString()),
            description: tx.description,
            createdAt: tx.createdAt
          })
      );

      return new CashShiftEntity({
        id: raw.id,
        openedByUserId: raw.openedByUserId,
        closedByUserId: raw.closedByUserId || undefined,
        openedAt: raw.openedAt,
        closedAt: raw.closedAt || undefined,
        initialAmount: Money.fromDecimal(raw.initialAmount.toString()),
        actualFinalAmount: raw.actualFinalAmount ? Money.fromDecimal(raw.actualFinalAmount.toString()) : undefined,
        status: raw.status as ShiftStatus,
        notes: raw.notes || undefined,
        transactions: domainTransactions
      });
    });
  }
}
