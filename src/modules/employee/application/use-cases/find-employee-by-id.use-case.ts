import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Employee } from '../../domain/entities/employee.entity.js';
import { EmployeeError } from '../../domain/errors/employee.error.js';
import type { EmployeeRepository } from '../../domain/repositories/employee.repository.js';

export class FindEmployeeByIdUseCase implements UseCase<string, Employee> {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) throw EmployeeError.notFound();
    return employee;
  }
}
