import type { SharedContainer } from '../../shared/shared.container.js';
import type { CustomerRepository } from '../customer/domain/repositories/customer.repository.js';
import { PrismaCustomerRepository } from '../customer/infrastructure/persistence/prisma-customer.repository.js';
import type { EmployeeRepository } from '../employee/domain/repositories/employee.repository.js';
import { PrismaEmployeeRepository } from '../employee/infrastructure/persistence/prisma-employee.repository.js';
import type { UserRepository } from '../user/domain/repositories/user.repository.js';
import { PrismaUserRepository } from '../user/infrastructure/persistence/prisma-user.repository.js';
import { AuthClaimsResolver } from './application/services/auth-claims.resolver.js';
import { GetMeUseCase } from './application/use-cases/get-me.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { RegisterCustomerUseCase } from './application/use-cases/register-customer.use-case.js';
import type { CustomerRegistrationRepository } from './domain/ports/customer-registration.repository.js';
import { PrismaCustomerRegistrationRepository } from './infrastructure/persistence/prisma-customer-registration.repository.js';

// Composition root do módulo: o único arquivo que liga port → adapter.
export function makeAuthContainer(shared: SharedContainer) {
  const userRepository: UserRepository = new PrismaUserRepository(
    shared.prisma,
  );
  const customerRepository: CustomerRepository = new PrismaCustomerRepository(
    shared.prisma,
  );
  const employeeRepository: EmployeeRepository = new PrismaEmployeeRepository(
    shared.prisma,
  );
  const registrationRepository: CustomerRegistrationRepository =
    new PrismaCustomerRegistrationRepository(shared.prisma);
  const claimsResolver = new AuthClaimsResolver(
    customerRepository,
    employeeRepository,
  );

  return {
    registerCustomer: new RegisterCustomerUseCase(
      userRepository,
      customerRepository,
      registrationRepository,
      shared.passwordHasher,
    ),
    login: new LoginUseCase(
      userRepository,
      shared.passwordHasher,
      shared.tokenService,
      claimsResolver,
    ),
    getMe: new GetMeUseCase(userRepository, claimsResolver),
  };
}

export type AuthUseCases = ReturnType<typeof makeAuthContainer>;
