import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { ServiceOrderMapper, withAggregate } from './service-order.mapper.js';

type Transaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export class PrismaServiceOrderRepository implements ServiceOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(serviceOrder: ServiceOrder): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceOrder.create({
        data: ServiceOrderMapper.toObject(serviceOrder),
      });
      await this.writeChildren(tx, serviceOrder);
    });
  }

  async findById(id: string): Promise<ServiceOrder | null> {
    const record = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: withAggregate,
    });
    return record ? ServiceOrderMapper.toEntity(record) : null;
  }

  // O agregado é a unidade de consistência: OS, itens e histórico gravam juntos
  // (transação interativa — toda query usa o `tx`).
  async save(serviceOrder: ServiceOrder): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.serviceOrder.updateMany({
        where: { id: serviceOrder.idValue },
        data: {
          assigneeId: serviceOrder.assigneeIdValue,
          status: serviceOrder.statusValue,
        },
      });
      if (count === 0) throw ServiceOrderError.notFound();

      // Itens que saíram da entity são apagados; os demais, regravados abaixo.
      const serviceItemIds = serviceOrder.servicesValue.map((i) => i.idValue);
      const productItemIds = serviceOrder.productsValue.map((i) => i.idValue);
      await tx.serviceItem.deleteMany({
        where: {
          serviceOrderId: serviceOrder.idValue,
          id: { notIn: serviceItemIds },
        },
      });
      await tx.productItem.deleteMany({
        where: {
          serviceOrderId: serviceOrder.idValue,
          id: { notIn: productItemIds },
        },
      });
      await this.writeChildren(tx, serviceOrder);
    });
  }

  // Upsert dos itens (só a quantidade muda: o preço é snapshot) e insert só das
  // linhas novas do histórico — as já gravadas são puladas (append-only).
  private async writeChildren(
    tx: Transaction,
    serviceOrder: ServiceOrder,
  ): Promise<void> {
    for (const item of ServiceOrderMapper.toServiceItems(serviceOrder)) {
      await tx.serviceItem.upsert({
        where: { id: item.id },
        create: item,
        update: { quantity: item.quantity },
      });
    }
    for (const item of ServiceOrderMapper.toProductItems(serviceOrder)) {
      await tx.productItem.upsert({
        where: { id: item.id },
        create: item,
        update: { quantity: item.quantity },
      });
    }
    await tx.serviceOrderStatusHistory.createMany({
      data: ServiceOrderMapper.toHistory(serviceOrder),
      skipDuplicates: true,
    });
  }
}
