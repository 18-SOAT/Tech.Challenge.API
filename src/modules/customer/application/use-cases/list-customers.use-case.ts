import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { Customer } from '../../domain/entities/customer.entity.js';
import type {
  CustomerFilter,
  CustomerRepository,
} from '../../domain/repositories/customer.repository.js';
import { onlyDigits } from '../../domain/validators/is-valid-document.js';

export class ListCustomersUseCase
  implements UseCase<CustomerFilter, Page<Customer>>
{
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(filter: CustomerFilter): Promise<Page<Customer>> {
    // O documento é persistido só com dígitos: a busca aceita com ou sem máscara.
    return this.customerRepository.findMany({
      ...filter,
      document: filter.document ? onlyDigits(filter.document) : undefined,
      name: filter.name?.trim() || undefined,
    });
  }
}
