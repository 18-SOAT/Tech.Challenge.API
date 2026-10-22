import { Order } from '../../src/modules/service-order/domain/entities/order.entity.js';
import type { OrderRepository } from '../../src/modules/service-order/domain/repositories/order.repository.js';

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
