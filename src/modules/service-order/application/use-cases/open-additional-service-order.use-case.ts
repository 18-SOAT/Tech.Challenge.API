import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderError } from '../../domain/errors/order.error.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface OpenAdditionalServiceOrderInput {
  orderId: string;
  description?: string | null;
  openedById: string;
}

// "Abrir reparo adicional": problema achado durante a estadia vira uma OS nova na
// mesma Ordem, com orçamento próprio — a OS já aprovada não é tocada.
export class OpenAdditionalServiceOrderUseCase
  implements UseCase<OpenAdditionalServiceOrderInput, ServiceOrder>
{
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: OpenAdditionalServiceOrderInput): Promise<ServiceOrder> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) throw OrderError.notFound();
    order.assertAcceptsServiceOrders();

    const serviceOrder = ServiceOrder.create({
      orderId: order.idValue,
      description: input.description,
      createdById: input.openedById,
    });
    await this.serviceOrderRepository.create(serviceOrder);
    return serviceOrder;
  }
}
