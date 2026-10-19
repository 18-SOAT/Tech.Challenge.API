import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { CustomerError } from '../../domain/errors/customer.error.js';
import type { CustomerRepository } from '../../domain/repositories/customer.repository.js';

export class DeleteCustomerUseCase implements UseCase<string, void> {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(id: string): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw CustomerError.notFound();

    // Regra do próprio cliente (login vinculado) na entity; veículo/OS vinculados
    // o repository detecta pela FK e lança CustomerError.hasDependencies.
    customer.assertCanBeRemoved();
    await this.customerRepository.delete(customer);
  }
}
