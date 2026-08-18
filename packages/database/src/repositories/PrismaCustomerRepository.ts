import {
  ICustomerRepository,
  CustomerMessageData,
  CustomerEntity
} from '@cardap/core';
import { prisma } from '../client.js';

export class PrismaCustomerRepository implements ICustomerRepository {
  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    const raw = await prisma.customer.findUnique({
      where: { phone },
      include: {
        tags: true,
        orders: { select: { totalAmount: true, createdAt: true } }
      }
    });

    if (!raw) return null;

    const totalOrdersCount = raw.orders.length;
    const totalSpentCents = raw.orders.reduce((acc, o) => acc + Math.round(Number(o.totalAmount) * 100), 0);
    const lastOrderAt = raw.orders.length > 0
      ? raw.orders.reduce((latest, o) => o.createdAt > latest ? o.createdAt : latest, raw.orders[0].createdAt)
      : undefined;

    return new CustomerEntity({
      id: raw.id,
      phone: raw.phone,
      name: raw.name || undefined,
      cpf: raw.cpf || undefined,
      email: raw.email || undefined,
      addressStreet: raw.addressStreet || undefined,
      addressNumber: raw.addressNumber || undefined,
      addressNeighborhood: raw.addressNeighborhood || undefined,
      addressCity: raw.addressCity || undefined,
      addressState: raw.addressState || undefined,
      totalOrdersCount,
      totalSpentCents,
      tags: raw.tags.map(t => t.name),
      lastOrderAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    });
  }

  async findById(id: string): Promise<CustomerEntity | null> {
    const raw = await prisma.customer.findUnique({
      where: { id },
      include: {
        tags: true,
        orders: { select: { totalAmount: true, createdAt: true } }
      }
    });

    if (!raw) return null;

    const totalOrdersCount = raw.orders.length;
    const totalSpentCents = raw.orders.reduce((acc, o) => acc + Math.round(Number(o.totalAmount) * 100), 0);
    const lastOrderAt = raw.orders.length > 0
      ? raw.orders.reduce((latest, o) => o.createdAt > latest ? o.createdAt : latest, raw.orders[0].createdAt)
      : undefined;

    return new CustomerEntity({
      id: raw.id,
      phone: raw.phone,
      name: raw.name || undefined,
      cpf: raw.cpf || undefined,
      email: raw.email || undefined,
      addressStreet: raw.addressStreet || undefined,
      addressNumber: raw.addressNumber || undefined,
      addressNeighborhood: raw.addressNeighborhood || undefined,
      addressCity: raw.addressCity || undefined,
      addressState: raw.addressState || undefined,
      totalOrdersCount,
      totalSpentCents,
      tags: raw.tags.map(t => t.name),
      lastOrderAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    });
  }

  async findAll(): Promise<CustomerEntity[]> {
    const rawList = await prisma.customer.findMany({
      include: {
        tags: true,
        orders: { select: { totalAmount: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return rawList.map(raw => {
      const totalOrdersCount = raw.orders.length;
      const totalSpentCents = raw.orders.reduce((acc, o) => acc + Math.round(Number(o.totalAmount) * 100), 0);
      const lastOrderAt = raw.orders.length > 0
        ? raw.orders.reduce((latest, o) => o.createdAt > latest ? o.createdAt : latest, raw.orders[0].createdAt)
        : undefined;

      return new CustomerEntity({
        id: raw.id,
        phone: raw.phone,
        name: raw.name || undefined,
        cpf: raw.cpf || undefined,
        email: raw.email || undefined,
        addressStreet: raw.addressStreet || undefined,
        addressNumber: raw.addressNumber || undefined,
        addressNeighborhood: raw.addressNeighborhood || undefined,
        addressCity: raw.addressCity || undefined,
        addressState: raw.addressState || undefined,
        totalOrdersCount,
        totalSpentCents,
        tags: raw.tags.map(t => t.name),
        lastOrderAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
      });
    });
  }

  async save(customer: CustomerEntity): Promise<void> {
    await prisma.customer.upsert({
      where: { id: customer.id },
      create: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        cpf: customer.cpf,
        email: customer.email,
        addressStreet: customer.addressStreet,
        addressNumber: customer.addressNumber,
        addressNeighborhood: customer.addressNeighborhood
      },
      update: {
        name: customer.name,
        cpf: customer.cpf,
        email: customer.email,
        addressStreet: customer.addressStreet,
        addressNumber: customer.addressNumber,
        addressNeighborhood: customer.addressNeighborhood
      }
    });

    // Salvar tags
    for (const tagName of customer.tags) {
      await prisma.customerTag.upsert({
        where: {
          customerId_name: {
            customerId: customer.id,
            name: tagName
          }
        },
        create: {
          customerId: customer.id,
          name: tagName
        },
        update: {}
      });
    }
  }

  async logMessage(message: CustomerMessageData): Promise<void> {
    await prisma.customerMessage.create({
      data: {
        id: message.id,
        customerId: message.customerId,
        orderId: message.orderId,
        direction: message.direction,
        remoteJid: message.remoteJid,
        content: message.content,
        status: message.status,
        evoInstanceId: message.evoInstanceId,
        createdAt: message.createdAt
      }
    });
  }

  async getMessagesByCustomerId(customerId: string): Promise<CustomerMessageData[]> {
    const rawList = await prisma.customerMessage.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' }
    });

    return rawList.map(raw => ({
      id: raw.id,
      customerId: raw.customerId,
      orderId: raw.orderId || undefined,
      direction: raw.direction as any,
      remoteJid: raw.remoteJid,
      content: raw.content,
      status: raw.status as any,
      evoInstanceId: raw.evoInstanceId || undefined,
      createdAt: raw.createdAt
    }));
  }
}
