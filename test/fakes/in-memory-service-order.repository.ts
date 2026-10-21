import type { ServiceOrder } from '../../src/modules/service-order/domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../src/modules/service-order/domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../src/modules/service-order/domain/repositories/service-order.repository.js';

export class InMemoryServiceOrderRepository implements ServiceOrderRepository {
  readonly items: ServiceOrder[] = [];

  async create(serviceOrder: ServiceOrder): Promise<void> {
    this.items.push(serviceOrder);
  }

  async findById(id: string): Promise<ServiceOrder | null> {
    return this.items.find((item) => item.idValue === id) ?? null;
  }

  async save(serviceOrder: ServiceOrder): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.idValue === serviceOrder.idValue,
    );
    if (index < 0) throw ServiceOrderError.notFound();
    this.items[index] = serviceOrder;
  }
}
