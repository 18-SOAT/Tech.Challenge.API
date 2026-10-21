import type { SharedContainer } from '../../shared/shared.container.js';
import type { AccessLinkMailer } from '../auth/domain/ports/access-link.mailer.js';
import { AuthMailer } from '../auth/infrastructure/mailers/auth.mailer.js';
import type { UserRepository } from '../user/domain/repositories/user.repository.js';
import { PrismaUserRepository } from '../user/infrastructure/persistence/prisma-user.repository.js';
import { ChangeEmployeeRoleUseCase } from './application/use-cases/change-employee-role.use-case.js';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case.js';
import { FindEmployeeByIdUseCase } from './application/use-cases/find-employee-by-id.use-case.js';
import { ListEmployeesUseCase } from './application/use-cases/list-employees.use-case.js';
import type { EmployeeRegistrationRepository } from './domain/ports/employee-registration.repository.js';
import type { EmployeeRepository } from './domain/repositories/employee.repository.js';
import { PrismaEmployeeRepository } from './infrastructure/persistence/prisma-employee.repository.js';
import { PrismaEmployeeRegistrationRepository } from './infrastructure/persistence/prisma-employee-registration.repository.js';

// Composition root do módulo: o único arquivo que liga port → adapter.
export function makeEmployeeContainer(shared: SharedContainer) {
  const userRepository: UserRepository = new PrismaUserRepository(
    shared.prisma,
  );
  const employeeRepository: EmployeeRepository = new PrismaEmployeeRepository(
    shared.prisma,
  );
  const registrationRepository: EmployeeRegistrationRepository =
    new PrismaEmployeeRegistrationRepository(shared.prisma);
  const mailer: AccessLinkMailer = new AuthMailer(
    shared.emailSender,
    shared.appUrl,
  );

  return {
    createEmployee: new CreateEmployeeUseCase(
      userRepository,
      registrationRepository,
      shared.passwordHasher,
      shared.accessLinkTokenService,
      mailer,
    ),
    listEmployees: new ListEmployeesUseCase(employeeRepository),
    findEmployeeById: new FindEmployeeByIdUseCase(employeeRepository),
    changeEmployeeRole: new ChangeEmployeeRoleUseCase(employeeRepository),
  };
}

export type EmployeeUseCases = ReturnType<typeof makeEmployeeContainer>;
