import type { Customer } from '../../src/modules/customer/domain/entities/customer.entity.js';
import { CustomerError } from '../../src/modules/customer/domain/errors/customer.error.js';
import type {
  CustomerFilter,
  CustomerRepository,
} from '../../src/modules/customer/domain/repositories/customer.repository.js';
import type { Page } from '../../src/shared/domain/pagination.js';

export class InMemoryCustomerRepository implements CustomerRepository {
  readonly items: Customer[] = [];
  // Ids com veículo/OS vinculados: simula a FK que o adapter Prisma traduz em erro.
  readonly withDependencies = new Set<string>();

  async findById(id: string): Promise<Customer | null> {
    return this.items.find((customer) => customer.idValue === id) ?? null;
  }

  async findByDocument(document: string): Promise<Customer | null> {
    return (
      this.items.find((customer) => customer.documentValue === document) ?? null
    );
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    return (
      this.items.find((customer) => customer.userIdValue === userId) ?? null
    );
  }

  async findMany(filter: CustomerFilter): Promise<Page<Customer>> {
    const name = filter.name?.toLowerCase();
    const matches = this.items.filter(
      (customer) =>
        (!filter.document || customer.documentValue === filter.document) &&
        (!name || customer.nameValue?.toLowerCase().includes(name)),
    );
    const start = (filter.page - 1) * filter.limit;
    return {
      items: matches.slice(start, start + filter.limit),
      total: matches.length,
    };
  }

  async save(customer: Customer): Promise<void> {
    const index = this.items.findIndex((c) => c.idValue === customer.idValue);
    if (index === -1) this.items.push(customer);
    else this.items[index] = customer;
  }

  async delete(customer: Customer): Promise<void> {
    if (this.withDependencies.has(customer.idValue)) {
      throw CustomerError.hasDependencies();
    }
    const index = this.items.findIndex((c) => c.idValue === customer.idValue);
    if (index !== -1) this.items.splice(index, 1);
  }
}
