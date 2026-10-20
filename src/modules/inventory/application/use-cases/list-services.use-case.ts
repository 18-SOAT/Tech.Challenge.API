import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { Service } from '../../domain/entities/service.entity.js';
import type {
  ServiceFilter,
  ServiceRepository,
} from '../../domain/repositories/service.repository.js';

export class ListServicesUseCase
  implements UseCase<ServiceFilter, Page<Service>>
{
  constructor(private readonly serviceRepository: ServiceRepository) {}

  async execute(filter: ServiceFilter): Promise<Page<Service>> {
    return this.serviceRepository.findMany({
      ...filter,
      name: filter.name?.trim() || undefined,
    });
  }
}
