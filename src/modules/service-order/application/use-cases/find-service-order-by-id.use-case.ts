import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type {
  ServiceOrder,
  ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface FindServiceOrderByIdInput {
  id: string;
  actor: ServiceOrderActor;
}

// Detalhe da OS para a equipe: o MECHANIC só vê as atribuídas a ele.
export class FindServiceOrderByIdUseCase
  implements UseCase<FindServiceOrderByIdInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: FindServiceOrderByIdInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(input.id);
    if (!serviceOrder) throw ServiceOrderError.notFound();
    serviceOrder.assertCanBeWorkedBy(input.actor);
    return serviceOrder;
  }
}
