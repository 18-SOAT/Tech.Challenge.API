import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { Order } from '../../domain/entities/order.entity.js';
import { TERMINAL_STATUSES } from '../../domain/entities/service-order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { OrderError } from '../../domain/errors/order.error.js';
import type { OrderDeliveryRepository } from '../../domain/ports/order-delivery.repository.js';

export class PrismaOrderDeliveryRepository implements OrderDeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // O use case validou com as OS que leu; um reparo adicional pode ter sido aberto
  // depois. O `FOR UPDATE` na Ordem enfileira com a criação da OS (que trava a mesma
  // linha, ver PrismaServiceOrderRepository.create), e a recontagem aqui dentro vê
  // o que de fato existe no momento da entrega.
  async deliver(order: Order): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM orders WHERE id = ${order.idValue}::uuid FOR UPDATE`;
      const open = await tx.serviceOrder.count({
        where: {
          orderId: order.idValue,
          status: { notIn: [...TERMINAL_STATUSES] },
        },
      });
      if (open > 0) throw OrderError.hasOpenServiceOrders();

      const { count } = await tx.order.updateMany({
        where: { id: order.idValue, status: { not: OrderStatus.DELIVERED } },
        data: {
          status: order.statusValue,
          deliveredAt: order.deliveredAtValue,
        },
      });
      if (count === 0) throw OrderError.alreadyDelivered();
    });
  }
}
