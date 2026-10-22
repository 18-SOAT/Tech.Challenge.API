import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { ServiceError } from '../../../inventory/domain/errors/service.error.js';
import type { ServiceRepository } from '../../../inventory/domain/repositories/service.repository.js';
import type {
  ServiceOrder,
  ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface AddServiceItemInput {
  serviceOrderId: string;
  serviceId: string;
  quantity: number;
  actor: ServiceOrderActor;
}

// "Incluir serviço" → "Serviço incluído", com o preço do catálogo congelado.
export class AddServiceItemUseCase
  implements UseCase<AddServiceItemInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(input: AddServiceItemInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!serviceOrder) throw ServiceOrderError.notFound();
    serviceOrder.assertCanBeWorkedBy(input.actor);

    const service = await this.serviceRepository.findById(input.serviceId);
    if (!service) throw ServiceError.notFound();

    serviceOrder.addService(service, input.quantity);
    await this.serviceOrderRepository.save(serviceOrder);
    return serviceOrder;
  }
}
