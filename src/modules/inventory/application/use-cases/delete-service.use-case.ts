import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { ServiceError } from '../../domain/errors/service.error.js';
import type { ServiceRepository } from '../../domain/repositories/service.repository.js';

export class DeleteServiceUseCase implements UseCase<string, void> {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  async execute(id: string): Promise<void> {
    const service = await this.serviceRepository.findById(id);
    if (!service) throw ServiceError.notFound();

    // Itens de OS ficam em outra tabela: o repository detecta pela FK (→ inUse).
    await this.serviceRepository.delete(service);
  }
}
