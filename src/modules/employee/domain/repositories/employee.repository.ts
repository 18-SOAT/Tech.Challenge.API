import type { Employee } from '../entities/employee.entity.js';

export interface EmployeeRepository {
  findByUserId(userId: string): Promise<Employee | null>;
}
