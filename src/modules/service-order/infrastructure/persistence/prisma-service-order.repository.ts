import type { Prisma } from '../../../../generated/prisma/client.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type {
  PrismaClient,
  PrismaTransaction,
} from '../../../../shared/infrastructure/prisma/client.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { OrderError } from '../../domain/errors/order.error.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type {
  FinishedServiceOrderFilter,
  ServiceOrderFilter,
  ServiceOrderQueueFilter,
  ServiceOrderRepository,
} from '../../domain/repositories/service-order.repository.js';
import { SERVICE_ORDER_QUEUE_PRIORITY } from '../../domain/services/service-order-queue.js';
import { ServiceOrderMapper, withAggregate } from './service-order.mapper.js';

export class PrismaServiceOrderRepository implements ServiceOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // O `FOR UPDATE` na Ordem enfileira o reparo adicional com a entrega
  // (PrismaOrderDeliveryRepository): se a entrega passou primeiro, a Ordem já está
  // DELIVERED quando este lock é obtido, e a OS não nasce.
  async create(serviceOrder: ServiceOrder): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const [order] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM orders WHERE id = ${serviceOrder.orderIdValue}::uuid FOR UPDATE`;
      if (order?.status === OrderStatus.DELIVERED) {
        throw OrderError.alreadyDelivered();
      }
      await tx.serviceOrder.create({
        data: ServiceOrderMapper.toObject(serviceOrder),
      });
      await this.writeChildren(tx, serviceOrder);
    });
  }

  async findByOrderId(orderId: string): Promise<ServiceOrder[]> {
    const records = await this.prisma.serviceOrder.findMany({
      where: { orderId },
      include: withAggregate,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return records.map(ServiceOrderMapper.toEntity);
  }

  async findMany(filter: ServiceOrderFilter): Promise<Page<ServiceOrder>> {
    const where: Prisma.ServiceOrderWhereInput = {
      status: filter.status,
      assigneeId: filter.assigneeId,
      order: filter.customerId ? { customerId: filter.customerId } : undefined,
      createdAt:
        filter.createdFrom || filter.createdTo
          ? { gte: filter.createdFrom, lte: filter.createdTo }
          : undefined,
    };
    // Lote na mesma transação: total e página vêm do mesmo snapshot.
    const [total, records] = await this.prisma.$transaction([
      this.prisma.serviceOrder.count({ where }),
      this.prisma.serviceOrder.findMany({
        where,
        include: withAggregate,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);
    return { items: records.map(ServiceOrderMapper.toEntity), total };
  }

  // A prioridade da fila não é a ordem de declaração do enum no banco, então o
  // orderBy do Prisma não a expressa: o SQL ordena pela posição do status no array
  // do domínio (SERVICE_ORDER_QUEUE_PRIORITY) e pela chegada da Ordem. A query só
  // devolve a página de ids; os agregados vêm depois, pelo caminho de sempre.
  async findQueue(
    filter: ServiceOrderQueueFilter,
  ): Promise<Page<ServiceOrder>> {
    const priority = [...SERVICE_ORDER_QUEUE_PRIORITY];
    const assigneeId = filter.assigneeId ?? null;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.serviceOrder.count({
        where: { status: { in: priority }, assigneeId: filter.assigneeId },
      }),
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT so.id
        FROM service_orders so
        JOIN orders o ON o.id = so.order_id
        WHERE so.status::text = ANY(${priority}::text[])
          AND (${assigneeId}::uuid IS NULL OR so.assignee_id = ${assigneeId}::uuid)
        ORDER BY array_position(${priority}::text[], so.status::text),
                 o.received_at, so.id
        LIMIT ${filter.limit} OFFSET ${(filter.page - 1) * filter.limit}`,
    ]);
    const ids = rows.map((row) => row.id);
    const records = await this.prisma.serviceOrder.findMany({
      where: { id: { in: ids } },
      include: withAggregate,
    });
    const byId = new Map(records.map((record) => [record.id, record]));
    const items = ids.flatMap((id) => {
      const record = byId.get(id);
      return record ? [ServiceOrderMapper.toEntity(record)] : [];
    });
    return { items, total };
  }

  // Período pelo FINISHED do histórico: é quando a execução terminou.
  async findFinished(
    filter: FinishedServiceOrderFilter,
  ): Promise<ServiceOrder[]> {
    const records = await this.prisma.serviceOrder.findMany({
      where: {
        status: ServiceOrderStatus.FINISHED,
        statusHistory: {
          some: {
            status: ServiceOrderStatus.FINISHED,
            changedAt: { gte: filter.finishedFrom, lte: filter.finishedTo },
          },
        },
        services: filter.serviceId
          ? { some: { serviceId: filter.serviceId } }
          : undefined,
      },
      include: withAggregate,
    });
    return records.map(ServiceOrderMapper.toEntity);
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
      // Lock otimista: a condição no status fecha a corrida entre duas transições
      // (ex: finalizar duas vezes) sem travar a linha durante o use case.
      const loaded = serviceOrder.loadedStatusValue;
      const { count } = await tx.serviceOrder.updateMany({
        where: {
          id: serviceOrder.idValue,
          ...(loaded ? { status: loaded } : {}),
        },
        data: {
          assigneeId: serviceOrder.assigneeIdValue,
          status: serviceOrder.statusValue,
        },
      });
      if (count === 0) {
        const exists = await tx.serviceOrder.count({
          where: { id: serviceOrder.idValue },
        });
        throw exists
          ? ServiceOrderError.concurrentUpdate()
          : ServiceOrderError.notFound();
      }

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
    tx: PrismaTransaction,
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
