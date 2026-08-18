import { prisma } from '../client.js';
import { ITableRepository, TableData, TableStatus } from '@cardap/core';

export class PrismaTableRepository implements ITableRepository {
  async findById(id: string): Promise<TableData | null> {
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) return null;
    return this.mapToDomain(table);
  }

  async findByNumber(number: number): Promise<TableData | null> {
    const table = await prisma.table.findUnique({ where: { number } });
    if (!table) return null;
    return this.mapToDomain(table);
  }

  async findByQrTokenSignature(signature: string): Promise<TableData | null> {
    const table = await prisma.table.findUnique({ where: { qrTokenSignature: signature } });
    if (!table) return null;
    return this.mapToDomain(table);
  }

  async save(table: TableData): Promise<void> {
    await prisma.table.upsert({
      where: { id: table.id },
      create: {
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        qrTokenSignature: table.qrTokenSignature,
        qrCodeUrl: table.qrCodeUrl,
        status: table.status as TableStatus,
        activeOrderTotal: (table.activeOrderTotalCents / 100)
      },
      update: {
        number: table.number,
        capacity: table.capacity,
        qrTokenSignature: table.qrTokenSignature,
        qrCodeUrl: table.qrCodeUrl,
        status: table.status as TableStatus,
        activeOrderTotal: (table.activeOrderTotalCents / 100)
      }
    });
  }

  async updateStatus(id: string, status: TableStatus): Promise<void> {
    await prisma.table.update({
      where: { id },
      data: { status: status as TableStatus }
    });
  }

  private mapToDomain(prismaTable: any): TableData {
    return {
      id: prismaTable.id,
      number: prismaTable.number,
      capacity: prismaTable.capacity,
      qrTokenSignature: prismaTable.qrTokenSignature,
      qrCodeUrl: prismaTable.qrCodeUrl || undefined,
      status: prismaTable.status as TableStatus,
      activeOrderTotalCents: Math.round(Number(prismaTable.activeOrderTotal) * 100)
    };
  }
}
