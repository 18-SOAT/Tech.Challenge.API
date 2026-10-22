import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Order } from '../../domain/entities/order.entity.js';
import { OrderError } from '../../domain/errors/order.error.js';
import type { OrderDeliveryRepository } from '../../domain/ports/order-delivery.repository.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface DeliverOrderInput {
  orderId: string;
}

// "Entregar veículo": a regra que cruza os agregados (todas as OS encerradas) é
// validada pela Order com os status que o use case leu; o adapter reconfere na
// transação.
export class DeliverOrderUseCase implements UseCase<DeliverOrderInput, Order> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly deliveryRepository: OrderDeliveryRepository,
  ) {}

  async execute(input: DeliverOrderInput): Promise<Order> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) throw OrderError.notFound();
    const serviceOrders = await this.serviceOrderRepository.findByOrderId(
      order.idValue,
    );

    order.deliver(
      serviceOrders.map((serviceOrder) => serviceOrder.statusValue),
    );
    await this.deliveryRepository.deliver(order);
    return order;
  }
}
