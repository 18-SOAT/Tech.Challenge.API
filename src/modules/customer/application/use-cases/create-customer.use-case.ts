import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { Customer } from '../../domain/entities/customer.entity.js';
import { CustomerError } from '../../domain/errors/customer.error.js';
import type { CustomerRepository } from '../../domain/repositories/customer.repository.js';
import { Document } from '../../domain/value-objects/document.vo.js';
import { Phone } from '../../domain/value-objects/phone.vo.js';

export interface CreateCustomerInput {
  name: string;
  document: string;
  email: string;
  phone?: string;
}

// Cadastro no balcão: o cliente nasce sem login (o primeiro acesso liga o User depois).
export class CreateCustomerUseCase
  implements UseCase<CreateCustomerInput, Customer>
{
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    const document = Document.create(input.document);

    // Unicidade depende do banco: nem o VO nem a entity fazem I/O.
    if (await this.customerRepository.findByDocument(document.value)) {
      throw CustomerError.documentAlreadyInUse();
    }

    const customer = Customer.create({
      name: input.name,
      document,
      email: Email.create(input.email),
      phone: input.phone ? Phone.create(input.phone) : null,
    });

    await this.customerRepository.save(customer);
    return customer;
  }
}
