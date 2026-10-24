import { Order } from '../../src/modules/service-order/domain/entities/order.entity.js';
import type {
  OrderFilter,
  OrderRepository,
} from '../../src/modules/service-order/domain/repositories/order.repository.js';
import type { Page } from '../../src/shared/domain/pagination.js';

// Cópia, como um SELECT: Order.start() num use case que falha não vaza para cá.
export const cloneOrder = (order: Order): Order =>
  Order.restore({
    id: order.idValue,
    number: order.numberValue ?? 0,
    customerId: order.customerIdValue,
    vehicleId: order.vehicleIdValue,
    status: order.statusValue,
    notes: order.notesValue,
    receivedAt: order.receivedAtValue,
    deliveredAt: order.deliveredAtValue,
  });

export class InMemoryOrderRepository implements OrderRepository {
  readonly items: Order[] = [];

  async findById(id: string): Promise<Order | null> {
    const stored = this.items.find((order) => order.idValue === id);
    return stored ? cloneOrder(stored) : null;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.items
      .filter((order) => order.customerIdValue === customerId)
      .reverse()
      .map(cloneOrder);
  }

  async findMany(filter: OrderFilter): Promise<Page<Order>> {
    const matches = this.items
      .filter(
        (order) =>
          (!filter.status || order.statusValue === filter.status) &&
          (!filter.customerId || order.customerIdValue === filter.customerId) &&
          (!filter.vehicleId || order.vehicleIdValue === filter.vehicleId) &&
          (!filter.receivedFrom ||
            order.receivedAtValue >= filter.receivedFrom) &&
          (!filter.receivedTo || order.receivedAtValue <= filter.receivedTo),
      )
      .sort(
        (a, b) =>
          b.receivedAtValue.getTime() - a.receivedAtValue.getTime() ||
          b.idValue.localeCompare(a.idValue),
      );
    const start = (filter.page - 1) * filter.limit;
    return {
      items: matches.slice(start, start + filter.limit).map(cloneOrder),
      total: matches.length,
    };
  }

  async hasOpenForVehicle(vehicleId: string): Promise<boolean> {
    return this.items.some(
      (order) => order.vehicleIdValue === vehicleId && !order.isDelivered,
    );
  }

  // Usado pelos fakes de transação: troca a Ordem gravada.
  replace(order: Order): void {
    const index = this.items.findIndex((o) => o.idValue === order.idValue);
    if (index >= 0) this.items[index] = cloneOrder(order);
  }
}
