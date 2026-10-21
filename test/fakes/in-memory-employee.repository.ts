import { Employee } from '../../src/modules/employee/domain/entities/employee.entity.js';
import { EmployeeRole } from '../../src/modules/employee/domain/enums/employee-role.enum.js';
import { EmployeeError } from '../../src/modules/employee/domain/errors/employee.error.js';
import type {
  EmployeeFilter,
  EmployeeRepository,
} from '../../src/modules/employee/domain/repositories/employee.repository.js';
import type { Page } from '../../src/shared/domain/pagination.js';

export class InMemoryEmployeeRepository implements EmployeeRepository {
  readonly items: Employee[] = [];

  async findById(id: string): Promise<Employee | null> {
    return this.items.find((employee) => employee.idValue === id) ?? null;
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    return (
      this.items.find((employee) => employee.userIdValue === userId) ?? null
    );
  }

  async findMany(filter: EmployeeFilter): Promise<Page<Employee>> {
    const name = filter.name?.toLowerCase();
    const matches = this.items
      .filter(
        (employee) =>
          (!filter.role || employee.roleValue === filter.role) &&
          (!name || employee.nameValue.toLowerCase().includes(name)),
      )
      .sort((a, b) => a.nameValue.localeCompare(b.nameValue));
    const start = (filter.page - 1) * filter.limit;
    return {
      items: matches.slice(start, start + filter.limit),
      total: matches.length,
    };
  }

  async countByRole(role: EmployeeRole): Promise<number> {
    return this.items.filter((employee) => employee.roleValue === role).length;
  }

  // Mesma checagem do adapter Prisma, contra o estado gravado (não o da entity
  // recebida): é o que pega a corrida que o use case não vê.
  async changeRole(employee: Employee): Promise<void> {
    const index = this.items.findIndex((e) => e.idValue === employee.idValue);
    const current = this.items[index];
    if (!current) throw EmployeeError.notFound();

    const adminCount = await this.countByRole(EmployeeRole.ADMIN);
    if (
      Employee.wouldLeaveNoAdmin(
        current.roleValue,
        employee.roleValue,
        adminCount,
      )
    ) {
      throw EmployeeError.lastAdmin();
    }
    this.items[index] = employee;
  }
}
