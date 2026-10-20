import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import type { Service } from '../../domain/entities/service.entity.js';
import { ServiceError } from '../../domain/errors/service.error.js';
import type { ServiceRepository } from '../../domain/repositories/service.repository.js';

export interface UpdateServiceInput {
  id: string;
  name?: string;
  description?: string | null;
  price?: number;
  estimatedDurationMinutes?: number | null;
  active?: boolean;
}

export class UpdateServiceUseCase
  implements UseCase<UpdateServiceInput, Service>
{
  constructor(private readonly serviceRepository: ServiceRepository) {}

  async execute(input: UpdateServiceInput): Promise<Service> {
    const service = await this.serviceRepository.findById(input.id);
    if (!service) throw ServiceError.notFound();

    // Checa antes de mutar: unicidade só importa se o nome é o de outro serviço.
    if (input.name !== undefined) {
      const owner = await this.serviceRepository.findByName(input.name.trim());
      if (owner && owner.idValue !== service.idValue) {
        throw ServiceError.nameAlreadyInUse();
      }
    }

    service.update({
      name: input.name,
      description: input.description,
      price:
        input.price === undefined ? undefined : Money.fromReais(input.price),
      estimatedDurationMinutes: input.estimatedDurationMinutes,
    });

    // Desativar é a saída para o serviço que já entrou em OS e não pode ser excluído.
    if (input.active === true) service.activate();
    if (input.active === false) service.deactivate();

    await this.serviceRepository.save(service);
    return service;
  }
}
