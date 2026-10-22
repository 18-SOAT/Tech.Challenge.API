import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { Order } from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { OrderError } from '../../domain/errors/order.error.js';
import type { OrderOpeningRepository } from '../../domain/ports/order-opening.repository.js';
import { OrderMapper } from './order.mapper.js';
import { ServiceOrderMapper } from './service-order.mapper.js';

export class PrismaOrderOpeningRepository implements OrderOpeningRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Dois atendentes abrindo ordem para o mesmo veículo ao mesmo tempo: cada use case
  // viu "nenhuma ordem aberta". O `FOR UPDATE` na linha do veículo enfileira as
  // transações: a segunda espera a primeira, relê e é recusada. Mesmo raciocínio do
  // PrismaEmployeeRepository.changeRole (ver repository.md#transações).
  async open(order: Order, serviceOrder: ServiceOrder): Promise<Order> {
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM vehicles WHERE id = ${order.vehicleIdValue}::uuid FOR UPDATE`;
      const open = await tx.order.count({
        where: {
          vehicleId: order.vehicleIdValue,
          status: { not: OrderStatus.DELIVERED },
        },
      });
      if (open > 0) throw OrderError.vehicleHasOpenOrder();

      const created = await tx.order.create({
        data: OrderMapper.toObject(order),
      });
      await tx.serviceOrder.create({
        data: ServiceOrderMapper.toObject(serviceOrder),
      });
      await tx.serviceItem.createMany({
        data: ServiceOrderMapper.toServiceItems(serviceOrder),
      });
      await tx.serviceOrderStatusHistory.createMany({
        data: ServiceOrderMapper.toHistory(serviceOrder),
      });
      return created;
    });
    return OrderMapper.toEntity(record);
  }
}
