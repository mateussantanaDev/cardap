import {
  OrderEntity,
  OrderItem,
  OrderItemOptionProps,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus
} from '@cardap/core';
import { Money } from '@cardap/core';

// Tipagem flexível para dados brutos vindos do Prisma Client com include estendido
export type PrismaOrderWithRelations = {
  id: string;
  orderNumber: number;
  type: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: any;
  deliveryFee: any;
  discountAmount: any;
  totalAmount: any;
  notes: string | null;
  customerId: string | null;
  tableId: string | null;
  shiftId: string;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: any;
    notes: string | null;
    product?: { name: string };
    modifiers?: Array<{
      id: string;
      name: string;
      priceAdjustment: any;
    }>;
    assemblies?: Array<{
      id: string;
      name: string;
      priceAdjustment: any;
      quantity: number;
    }>;
    complements?: Array<{
      id: string;
      name: string;
      price: any;
      quantity: number;
    }>;
  }>;
};

/**
 * Mapper: Converte entre modelos relacionais do Prisma ORM e o Agregado de Domínio OrderEntity.
 */
export class OrderMapper {
  /**
   * Reconstitui uma instância de OrderEntity a partir do retorno relacional do Prisma.
   */
  public static toDomain(raw: PrismaOrderWithRelations): OrderEntity {
    const domainItems: OrderItem[] = (raw.items || []).map(item => {
      const mapOptions = (opts?: any[], isComplement = false): OrderItemOptionProps[] => {
        if (!opts) return [];
        return opts.map(o => ({
          id: o.id,
          name: o.name,
          priceAdjustment: Money.fromDecimal(isComplement ? (o.price || 0) : (o.priceAdjustment || 0)),
          quantity: o.quantity || 1
        }));
      };

      return new OrderItem({
        id: item.id,
        productId: item.productId || 'prod-default',
        productName: item.product?.name || 'Produto',
        quantity: item.quantity || 1,
        unitPrice: Money.fromDecimal(item.unitPrice || 0),
        notes: item.notes || undefined,
        modifiers: mapOptions(item.modifiers),
        assemblies: mapOptions(item.assemblies),
        complements: mapOptions(item.complements, true)
      });
    });

    return new OrderEntity({
      id: raw.id,
      orderNumber: raw.orderNumber,
      type: raw.type as OrderType,
      status: raw.status as OrderStatus,
      paymentMethod: raw.paymentMethod as PaymentMethod,
      paymentStatus: raw.paymentStatus as PaymentStatus,
      deliveryFee: Money.fromDecimal(raw.deliveryFee),
      discountAmount: Money.fromDecimal(raw.discountAmount),
      items: domainItems,
      customerId: raw.customerId || undefined,
      tableId: raw.tableId || undefined,
      shiftId: raw.shiftId,
      notes: raw.notes || undefined,
      createdAt: raw.createdAt
    });
  }

  /**
   * Converte a entidade de domínio OrderEntity em objeto de inserção/atualização do Prisma.
   */
  public static toPrismaCreate(order: OrderEntity) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal.toDecimal(),
      deliveryFee: order.deliveryFee.toDecimal(),
      discountAmount: order.discountAmount.toDecimal(),
      totalAmount: order.totalAmount.toDecimal(),
      notes: order.notes,
      customerId: order.customerId,
      tableId: order.tableId,
      shiftId: order.shiftId,
      createdAt: order.createdAt,
      items: {
        create: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toDecimal(),
          totalPrice: item.calculateTotal().toDecimal(),
          notes: item.notes,
          modifiers: {
            create: item.modifiers.map(m => ({
              modifierOptionId: m.id,
              name: m.name,
              priceAdjustment: m.priceAdjustment.toDecimal()
            }))
          },
          assemblies: {
            create: item.assemblies.map(a => ({
              assemblyOptionId: a.id,
              name: a.name,
              priceAdjustment: a.priceAdjustment.toDecimal(),
              quantity: a.quantity
            }))
          },
          complements: {
            create: item.complements.map(c => ({
              complementOptionId: c.id,
              name: c.name,
              price: c.priceAdjustment.toDecimal(),
              quantity: c.quantity
            }))
          }
        }))
      }
    };
  }
}
