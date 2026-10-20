import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Customer } from '../../domain/entities/customer.entity.js';
import { CustomerError } from '../../domain/errors/customer.error.js';
import type { CustomerRepository } from '../../domain/repositories/customer.repository.js';

export class FindCustomerByIdUseCase implements UseCase<string, Customer> {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw CustomerError.notFound();
    return customer;
  }
}
