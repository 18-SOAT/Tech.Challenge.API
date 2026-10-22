import type {
  Prisma,
  Order as PrismaOrder,
} from '../../../../generated/prisma/client.js';
import { Order } from '../../domain/entities/order.entity.js';
import type { OrderStatus } from '../../domain/enums/order-status.enum.js';

export class OrderMapper {
  static toEntity(record: PrismaOrder): Order {
    return Order.restore({
      id: record.id,
      number: record.number,
      customerId: record.customerId,
      vehicleId: record.vehicleId,
      status: record.status as OrderStatus,
      notes: record.notes,
      receivedAt: record.receivedAt,
      deliveredAt: record.deliveredAt,
    });
  }

  // Sem `number`: quem gera é o autoincrement do banco.
  static toObject(entity: Order): Prisma.OrderUncheckedCreateInput {
    return {
      id: entity.idValue,
      customerId: entity.customerIdValue,
      vehicleId: entity.vehicleIdValue,
      status: entity.statusValue,
      notes: entity.notesValue,
      receivedAt: entity.receivedAtValue,
      deliveredAt: entity.deliveredAtValue,
    };
  }
}
