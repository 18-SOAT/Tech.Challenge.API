import type { Prisma } from '../../../../generated/prisma/client.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { Order } from '../../domain/entities/order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import type {
  OrderFilter,
  OrderRepository,
} from '../../domain/repositories/order.repository.js';
import { OrderMapper } from './order.mapper.js';

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({ where: { id } });
    return record ? OrderMapper.toEntity(record) : null;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    });
    return records.map(OrderMapper.toEntity);
  }

  async findMany(filter: OrderFilter): Promise<Page<Order>> {
    const where: Prisma.OrderWhereInput = {
      status: filter.status,
      customerId: filter.customerId,
      vehicleId: filter.vehicleId,
      receivedAt:
        filter.receivedFrom || filter.receivedTo
          ? { gte: filter.receivedFrom, lte: filter.receivedTo }
          : undefined,
    };
    // Lote na mesma transação: total e página vêm do mesmo snapshot.
    const [total, records] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);
    return { items: records.map(OrderMapper.toEntity), total };
  }

  async hasOpenForVehicle(vehicleId: string): Promise<boolean> {
    const count = await this.prisma.order.count({
      where: { vehicleId, status: { not: OrderStatus.DELIVERED } },
    });
    return count > 0;
  }
}
