import { Order } from '../../src/modules/service-order/domain/entities/order.entity.js';
import type { ServiceOrder } from '../../src/modules/service-order/domain/entities/service-order.entity.js';
import { OrderError } from '../../src/modules/service-order/domain/errors/order.error.js';
import type { OrderOpeningRepository } from '../../src/modules/service-order/domain/ports/order-opening.repository.js';
import type { InMemoryOrderRepository } from './in-memory-order.repository.js';
import type { InMemoryServiceOrderRepository } from './in-memory-service-order.repository.js';

// Grava nos dois repositórios in-memory, simulando a transação do adapter Prisma:
// checa a ordem aberta antes de mutar e gera o `number` sequencial (autoincrement).
export class InMemoryOrderOpeningRepository implements OrderOpeningRepository {
  constructor(
    private readonly orders: InMemoryOrderRepository,
    private readonly serviceOrders: InMemoryServiceOrderRepository,
  ) {}

  async open(order: Order, serviceOrder: ServiceOrder): Promise<Order> {
    if (await this.orders.hasOpenForVehicle(order.vehicleIdValue)) {
      throw OrderError.vehicleHasOpenOrder();
    }
    const saved = Order.restore({
      id: order.idValue,
      number: this.orders.items.length + 1,
      customerId: order.customerIdValue,
      vehicleId: order.vehicleIdValue,
      status: order.statusValue,
      notes: order.notesValue,
      receivedAt: order.receivedAtValue,
      deliveredAt: order.deliveredAtValue,
    });
    this.orders.items.push(saved);
    this.serviceOrders.items.push(serviceOrder);
    return saved;
  }
}
