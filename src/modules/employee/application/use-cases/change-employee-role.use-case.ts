import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Employee } from '../../domain/entities/employee.entity.js';
import { EmployeeRole } from '../../domain/enums/employee-role.enum.js';
import { EmployeeError } from '../../domain/errors/employee.error.js';
import type { EmployeeRepository } from '../../domain/repositories/employee.repository.js';

export interface ChangeEmployeeRoleInput {
  id: string;
  role: EmployeeRole;
}

// "Alterar papel" → "Papel do funcionário alterado". O papel novo só vale no próximo
// login: o JWT atual carrega o papel de quando foi emitido.
export class ChangeEmployeeRoleUseCase
  implements UseCase<ChangeEmployeeRoleInput, Employee>
{
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(input: ChangeEmployeeRoleInput): Promise<Employee> {
    const employee = await this.employeeRepository.findById(input.id);
    if (!employee) throw EmployeeError.notFound();
    if (employee.roleValue === input.role) return employee;

    const adminCount = await this.employeeRepository.countByRole(
      EmployeeRole.ADMIN,
    );
    employee.changeRole(input.role, adminCount);

    await this.employeeRepository.changeRole(employee);
    return employee;
  }
}
