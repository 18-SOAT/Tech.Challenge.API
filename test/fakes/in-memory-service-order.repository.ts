import { ProductItem } from '../../src/modules/service-order/domain/entities/product-item.entity.js';
import { ServiceItem } from '../../src/modules/service-order/domain/entities/service-item.entity.js';
import { ServiceOrder } from '../../src/modules/service-order/domain/entities/service-order.entity.js';
import { ServiceOrderStatusHistory } from '../../src/modules/service-order/domain/entities/service-order-status-history.entity.js';
import { ServiceOrderStatus } from '../../src/modules/service-order/domain/enums/service-order-status.enum.js';
import { ServiceOrderError } from '../../src/modules/service-order/domain/errors/service-order.error.js';
import type {
  FinishedServiceOrderFilter,
  ServiceOrderFilter,
  ServiceOrderQueueFilter,
  ServiceOrderRepository,
} from '../../src/modules/service-order/domain/repositories/service-order.repository.js';
import { SERVICE_ORDER_QUEUE_PRIORITY } from '../../src/modules/service-order/domain/services/service-order-queue.js';
import type { Page, PageRequest } from '../../src/shared/domain/pagination.js';
import type { InMemoryOrderRepository } from './in-memory-order.repository.js';

// Cópia do agregado, como um SELECT faria (mesma ideia do cloneProduct): sem isso,
// uma transição feita em memória por um use case que depois falha (ex: aprovação
// com saldo insuficiente) vazaria para cá e o fake esconderia o rollback.
export const cloneServiceOrder = (serviceOrder: ServiceOrder): ServiceOrder =>
  ServiceOrder.restore({
    id: serviceOrder.idValue,
    orderId: serviceOrder.orderIdValue,
    assigneeId: serviceOrder.assigneeIdValue,
    status: serviceOrder.statusValue,
    description: serviceOrder.descriptionValue,
    approvedAmount: serviceOrder.approvedAmountValue?.value ?? null,
    approvedAt: serviceOrder.approvedAtValue,
    createdAt: serviceOrder.createdAtValue,
    services: serviceOrder.servicesValue.map((item) =>
      ServiceItem.restore({
        id: item.idValue,
        serviceId: item.serviceIdValue,
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue.value,
      }),
    ),
    products: serviceOrder.productsValue.map((item) =>
      ProductItem.restore({
        id: item.idValue,
        productId: item.productIdValue,
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue.value,
      }),
    ),
    history: serviceOrder.historyValue.map((row) =>
      ServiceOrderStatusHistory.restore({
        id: row.idValue,
        status: row.statusValue,
        changedById: row.changedByIdValue,
        changedAt: row.changedAtValue,
      }),
    ),
  });

const paginate = <T>(items: T[], filter: PageRequest): Page<T> => {
  const start = (filter.page - 1) * filter.limit;
  return {
    items: items.slice(start, start + filter.limit),
    total: items.length,
  };
};

const changedAtOf = (serviceOrder: ServiceOrder, status: ServiceOrderStatus) =>
  serviceOrder.historyValue.find((row) => row.statusValue === status)
    ?.changedAtValue;

// As Ordens entram para o que o adapter resolve com join: o cliente da OS e a
// chegada do veículo (ordenação da fila).
export class InMemoryServiceOrderRepository implements ServiceOrderRepository {
  readonly items: ServiceOrder[] = [];

  constructor(private readonly orders: InMemoryOrderRepository) {}

  async create(serviceOrder: ServiceOrder): Promise<void> {
    this.items.push(cloneServiceOrder(serviceOrder));
  }

  async findById(id: string): Promise<ServiceOrder | null> {
    const stored = this.items.find((item) => item.idValue === id);
    return stored ? cloneServiceOrder(stored) : null;
  }

  async findByOrderId(orderId: string): Promise<ServiceOrder[]> {
    return this.items
      .filter((item) => item.orderIdValue === orderId)
      .map(cloneServiceOrder);
  }

  async findMany(filter: ServiceOrderFilter): Promise<Page<ServiceOrder>> {
    const matches = this.items
      .filter(
        (so) =>
          (!filter.status || so.statusValue === filter.status) &&
          (!filter.assigneeId || so.assigneeIdValue === filter.assigneeId) &&
          (!filter.customerId ||
            this.orderOf(so)?.customerIdValue === filter.customerId) &&
          (!filter.createdFrom || so.createdAtValue >= filter.createdFrom) &&
          (!filter.createdTo || so.createdAtValue <= filter.createdTo),
      )
      .sort(
        (a, b) =>
          b.createdAtValue.getTime() - a.createdAtValue.getTime() ||
          b.idValue.localeCompare(a.idValue),
      );
    return paginate(matches.map(cloneServiceOrder), filter);
  }

  async findQueue(
    filter: ServiceOrderQueueFilter,
  ): Promise<Page<ServiceOrder>> {
    const priority = (so: ServiceOrder) =>
      SERVICE_ORDER_QUEUE_PRIORITY.indexOf(so.statusValue);
    const receivedAt = (so: ServiceOrder) =>
      this.orderOf(so)?.receivedAtValue.getTime() ?? 0;
    const matches = this.items
      .filter(
        (so) =>
          priority(so) >= 0 &&
          (!filter.assigneeId || so.assigneeIdValue === filter.assigneeId),
      )
      .sort(
        (a, b) =>
          priority(a) - priority(b) ||
          receivedAt(a) - receivedAt(b) ||
          a.idValue.localeCompare(b.idValue),
      );
    return paginate(matches.map(cloneServiceOrder), filter);
  }

  async findFinished(
    filter: FinishedServiceOrderFilter,
  ): Promise<ServiceOrder[]> {
    return this.items
      .filter((so) => {
        const finishedAt = changedAtOf(so, ServiceOrderStatus.FINISHED);
        return (
          so.statusValue === ServiceOrderStatus.FINISHED &&
          finishedAt !== undefined &&
          (!filter.finishedFrom || finishedAt >= filter.finishedFrom) &&
          (!filter.finishedTo || finishedAt <= filter.finishedTo) &&
          (!filter.serviceId ||
            so.servicesValue.some(
              (item) => item.serviceIdValue === filter.serviceId,
            ))
        );
      })
      .map(cloneServiceOrder);
  }

  private orderOf(serviceOrder: ServiceOrder) {
    return this.orders.items.find(
      (order) => order.idValue === serviceOrder.orderIdValue,
    );
  }

  // Lock otimista como o adapter: o status gravado precisa ser o que a entity leu.
  async save(serviceOrder: ServiceOrder): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.idValue === serviceOrder.idValue,
    );
    const stored = this.items[index];
    if (!stored) throw ServiceOrderError.notFound();
    const loaded = serviceOrder.loadedStatusValue;
    if (loaded && stored.statusValue !== loaded) {
      throw ServiceOrderError.concurrentUpdate();
    }
    this.items[index] = cloneServiceOrder(serviceOrder);
  }
}
