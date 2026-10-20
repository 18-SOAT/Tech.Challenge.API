import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Service } from '../../domain/entities/service.entity.js';
import { ServiceError } from '../../domain/errors/service.error.js';
import type { ServiceRepository } from '../../domain/repositories/service.repository.js';

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  price: number;
  estimatedDurationMinutes?: number | null;
}

export class CreateServiceUseCase
  implements UseCase<CreateServiceInput, Service>
{
  constructor(private readonly serviceRepository: ServiceRepository) {}

  async execute(input: CreateServiceInput): Promise<Service> {
    const service = Service.create({
      name: input.name,
      description: input.description,
      price: Money.fromReais(input.price),
      estimatedDurationMinutes: input.estimatedDurationMinutes,
    });

    // Nome único é regra do catálogo inteiro (I/O): checado aqui, não na entity.
    if (await this.serviceRepository.findByName(service.nameValue)) {
      throw ServiceError.nameAlreadyInUse();
    }

    await this.serviceRepository.save(service);
    return service;
  }
}
