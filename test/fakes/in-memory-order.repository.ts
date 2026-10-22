import type { Order } from '../../src/modules/service-order/domain/entities/order.entity.js';
import type { OrderRepository } from '../../src/modules/service-order/domain/repositories/order.repository.js';

export class InMemoryOrderRepository implements OrderRepository {
  readonly items: Order[] = [];

  async findById(id: string): Promise<Order | null> {
    return this.items.find((order) => order.idValue === id) ?? null;
  }

  async hasOpenForVehicle(vehicleId: string): Promise<boolean> {
    return this.items.some(
      (order) => order.vehicleIdValue === vehicleId && !order.isDelivered,
    );
  }
}
