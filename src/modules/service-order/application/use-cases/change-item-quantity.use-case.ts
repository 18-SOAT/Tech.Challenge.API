import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type {
  ServiceOrder,
  ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface ChangeItemQuantityInput {
  serviceOrderId: string;
  itemId: string;
  quantity: number;
  actor: ServiceOrderActor;
}

// Corrige a quantidade de um item (serviço ou produto) durante o diagnóstico.
export class ChangeItemQuantityUseCase
  implements UseCase<ChangeItemQuantityInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: ChangeItemQuantityInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!serviceOrder) throw ServiceOrderError.notFound();
    serviceOrder.assertCanBeWorkedBy(input.actor);

    serviceOrder.changeItemQuantity(input.itemId, input.quantity);
    await this.serviceOrderRepository.save(serviceOrder);
    return serviceOrder;
  }
}
