import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type {
  ServiceOrder,
  ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface FinishServiceOrderInput {
  serviceOrderId: string;
  actor: ServiceOrderActor;
}

// "Finalizar OS": pelo mecânico responsável (ou um ADMIN). O lock otimista do
// save() barra a mesma OS finalizada duas vezes ao mesmo tempo.
export class FinishServiceOrderUseCase
  implements UseCase<FinishServiceOrderInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: FinishServiceOrderInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!serviceOrder) throw ServiceOrderError.notFound();
    serviceOrder.assertCanBeWorkedBy(input.actor);

    serviceOrder.finish(input.actor.employeeId);
    await this.serviceOrderRepository.save(serviceOrder);
    return serviceOrder;
  }
}
