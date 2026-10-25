import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import {
  ServiceOrder,
  type ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import type {
  ServiceOrderQueueFilter,
  ServiceOrderRepository,
} from '../../domain/repositories/service-order.repository.js';

export interface ListServiceOrderQueueInput extends ServiceOrderQueueFilter {
  actor: ServiceOrderActor;
}

// "Consultar fila de OS": o que fazer primeiro (SERVICE_ORDER_QUEUE_PRIORITY). O
// MECHANIC vê a fila dele; o ADMIN, a da oficina ou a de um mecânico.
export class ListServiceOrderQueueUseCase
  implements UseCase<ListServiceOrderQueueInput, Page<ServiceOrder>>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute({
    actor,
    ...filter
  }: ListServiceOrderQueueInput): Promise<Page<ServiceOrder>> {
    return this.serviceOrderRepository.findQueue({
      ...filter,
      assigneeId: ServiceOrder.assigneeScopeFor(actor, filter.assigneeId),
    });
  }
}
