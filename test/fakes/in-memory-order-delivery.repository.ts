import type { Order } from '../../src/modules/service-order/domain/entities/order.entity.js';
import { TERMINAL_STATUSES } from '../../src/modules/service-order/domain/entities/service-order.entity.js';
import { OrderError } from '../../src/modules/service-order/domain/errors/order.error.js';
import type { OrderDeliveryRepository } from '../../src/modules/service-order/domain/ports/order-delivery.repository.js';
import type { InMemoryOrderRepository } from './in-memory-order.repository.js';
import type { InMemoryServiceOrderRepository } from './in-memory-service-order.repository.js';

// Reconfere o estado GRAVADO, como o adapter faz dentro da transação: OS ainda
// abertas ou Ordem já entregue barram a entrega.
export class InMemoryOrderDeliveryRepository
  implements OrderDeliveryRepository
{
  constructor(
    private readonly orders: InMemoryOrderRepository,
    private readonly serviceOrders: InMemoryServiceOrderRepository,
  ) {}

  async deliver(order: Order): Promise<void> {
    const hasOpen = this.serviceOrders.items.some(
      (item) =>
        item.orderIdValue === order.idValue &&
        !TERMINAL_STATUSES.includes(item.statusValue),
    );
    if (hasOpen) throw OrderError.hasOpenServiceOrders();
    const stored = this.orders.items.find((o) => o.idValue === order.idValue);
    if (!stored || stored.isDelivered) throw OrderError.alreadyDelivered();
    this.orders.replace(order);
  }
}
