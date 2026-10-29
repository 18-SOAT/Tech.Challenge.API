import type { Employee } from '../../src/modules/employee/domain/entities/employee.entity.js';
import type { EmployeeRegistrationRepository } from '../../src/modules/employee/domain/ports/employee-registration.repository.js';
import type { User } from '../../src/modules/user/domain/entities/user.entity.js';
import { UserError } from '../../src/modules/user/domain/errors/user.error.js';
import type { InMemoryEmployeeRepository } from './in-memory-employee.repository.js';
import type { InMemoryUserRepository } from './in-memory-user.repository.js';

// Grava nos dois repositórios in-memory, simulando a transação do adapter Prisma:
// valida antes de mutar (tudo ou nada), com o unique de e-mail do banco.
export class InMemoryEmployeeRegistrationRepository
  implements EmployeeRegistrationRepository
{
  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly employees: InMemoryEmployeeRepository,
  ) {}

  async register(user: User, employee: Employee): Promise<void> {
    if (
      this.users.items.some((u) => u.emailCanonical === user.emailCanonical)
    ) {
      throw UserError.emailAlreadyInUse();
    }
    this.users.items.push(user);
    this.employees.items.push(employee);
  }
}
