import type { SharedContainer } from '../../shared/shared.container.js';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case.js';
import { DeleteCustomerUseCase } from './application/use-cases/delete-customer.use-case.js';
import { FindCustomerByIdUseCase } from './application/use-cases/find-customer-by-id.use-case.js';
import { ListCustomersUseCase } from './application/use-cases/list-customers.use-case.js';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer.use-case.js';
import type { CustomerRepository } from './domain/repositories/customer.repository.js';
import { PrismaCustomerRepository } from './infrastructure/persistence/prisma-customer.repository.js';

// Composition root do módulo: o único arquivo que liga port → adapter.
export function makeCustomerContainer(shared: SharedContainer) {
  const customerRepository: CustomerRepository = new PrismaCustomerRepository(
    shared.prisma,
  );

  return {
    createCustomer: new CreateCustomerUseCase(customerRepository),
    listCustomers: new ListCustomersUseCase(customerRepository),
    findCustomerById: new FindCustomerByIdUseCase(customerRepository),
    updateCustomer: new UpdateCustomerUseCase(customerRepository),
    deleteCustomer: new DeleteCustomerUseCase(customerRepository),
  };
}

export type CustomerUseCases = ReturnType<typeof makeCustomerContainer>;
