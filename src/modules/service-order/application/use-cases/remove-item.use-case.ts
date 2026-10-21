import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type {
  ServiceOrder,
  ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface RemoveItemInput {
  serviceOrderId: string;
  itemId: string;
  actor: ServiceOrderActor;
}

// Tira um item incluído por engano, enquanto a OS está em diagnóstico.
export class RemoveItemUseCase
  implements UseCase<RemoveItemInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: RemoveItemInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!serviceOrder) throw ServiceOrderError.notFound();
    serviceOrder.assertCanBeWorkedBy(input.actor);

    serviceOrder.removeItem(input.itemId);
    await this.serviceOrderRepository.save(serviceOrder);
    return serviceOrder;
  }
}
