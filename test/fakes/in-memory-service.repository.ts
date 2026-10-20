import type { Service } from '../../src/modules/inventory/domain/entities/service.entity.js';
import { ServiceError } from '../../src/modules/inventory/domain/errors/service.error.js';
import type {
  ServiceFilter,
  ServiceRepository,
} from '../../src/modules/inventory/domain/repositories/service.repository.js';
import type { Page } from '../../src/shared/domain/pagination.js';

export class InMemoryServiceRepository implements ServiceRepository {
  readonly items: Service[] = [];
  // Ids já usados em OS: simula a FK de service_items que o adapter Prisma traduz em erro.
  readonly usedInServiceOrders = new Set<string>();

  async findById(id: string): Promise<Service | null> {
    return this.items.find((service) => service.idValue === id) ?? null;
  }

  async findByName(name: string): Promise<Service | null> {
    const wanted = name.toLowerCase();
    return (
      this.items.find(
        (service) => service.nameValue.toLowerCase() === wanted,
      ) ?? null
    );
  }

  async findMany(filter: ServiceFilter): Promise<Page<Service>> {
    const name = filter.name?.toLowerCase();
    const matches = this.items.filter(
      (service) =>
        (!name || service.nameValue.toLowerCase().includes(name)) &&
        (filter.active === undefined || service.isActive === filter.active),
    );
    const start = (filter.page - 1) * filter.limit;
    return {
      items: matches.slice(start, start + filter.limit),
      total: matches.length,
    };
  }

  async save(service: Service): Promise<void> {
    const index = this.items.findIndex((s) => s.idValue === service.idValue);
    if (index === -1) this.items.push(service);
    else this.items[index] = service;
  }

  async delete(service: Service): Promise<void> {
    if (this.usedInServiceOrders.has(service.idValue)) {
      throw ServiceError.inUse();
    }
    const index = this.items.findIndex((s) => s.idValue === service.idValue);
    if (index !== -1) this.items.splice(index, 1);
  }
}
