import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import {
  ServiceOrder,
  type ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import type {
  ServiceOrderFilter,
  ServiceOrderRepository,
} from '../../domain/repositories/service-order.repository.js';

export interface ListServiceOrdersInput extends ServiceOrderFilter {
  actor: ServiceOrderActor;
}

// Listagem administrativa das OS. O MECHANIC só recebe as atribuídas a ele.
export class ListServiceOrdersUseCase
  implements UseCase<ListServiceOrdersInput, Page<ServiceOrder>>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute({
    actor,
    ...filter
  }: ListServiceOrdersInput): Promise<Page<ServiceOrder>> {
    return this.serviceOrderRepository.findMany({
      ...filter,
      assigneeId: ServiceOrder.assigneeScopeFor(actor, filter.assigneeId),
    });
  }
}
