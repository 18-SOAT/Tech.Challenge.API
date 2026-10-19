import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import type { Customer } from '../../domain/entities/customer.entity.js';
import { CustomerError } from '../../domain/errors/customer.error.js';
import type { CustomerRepository } from '../../domain/repositories/customer.repository.js';
import { Phone } from '../../domain/value-objects/phone.vo.js';

export interface UpdateCustomerInput {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
}

export class UpdateCustomerUseCase
  implements UseCase<UpdateCustomerInput, Customer>
{
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(input: UpdateCustomerInput): Promise<Customer> {
    const customer = await this.customerRepository.findById(input.id);
    if (!customer) throw CustomerError.notFound();

    // `undefined` mantém, `null` remove (só o telefone é opcional).
    customer.update({
      name: input.name,
      email: input.email === undefined ? undefined : Email.create(input.email),
      phone:
        input.phone === undefined || input.phone === null
          ? input.phone
          : Phone.create(input.phone),
    });

    await this.customerRepository.save(customer);
    return customer;
  }
}
