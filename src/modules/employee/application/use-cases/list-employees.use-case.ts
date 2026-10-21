import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { Employee } from '../../domain/entities/employee.entity.js';
import type {
  EmployeeFilter,
  EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';

export class ListEmployeesUseCase
  implements UseCase<EmployeeFilter, Page<Employee>>
{
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(filter: EmployeeFilter): Promise<Page<Employee>> {
    return this.employeeRepository.findMany({
      ...filter,
      name: filter.name?.trim() || undefined,
    });
  }
}
