import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Service } from '../../domain/entities/service.entity.js';
import { ServiceError } from '../../domain/errors/service.error.js';
import type { ServiceRepository } from '../../domain/repositories/service.repository.js';

export class FindServiceByIdUseCase implements UseCase<string, Service> {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  async execute(id: string): Promise<Service> {
    const service = await this.serviceRepository.findById(id);
    if (!service) throw ServiceError.notFound();
    return service;
  }
}
