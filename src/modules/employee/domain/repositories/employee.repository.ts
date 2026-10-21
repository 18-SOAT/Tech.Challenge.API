import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { Employee } from '../entities/employee.entity.js';
import type { EmployeeRole } from '../enums/employee-role.enum.js';

// Filtros opcionais da listagem: `role` exato, `name` parcial.
export interface EmployeeFilter extends PageRequest {
  role?: EmployeeRole;
  name?: string;
}

export interface EmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByUserId(userId: string): Promise<Employee | null>;
  findMany(filter: EmployeeFilter): Promise<Page<Employee>>;
  countByRole(role: EmployeeRole): Promise<number>;
  // Grava o papel novo. Repete a checagem do último ADMIN com os ADMINs travados
  // (dois rebaixamentos simultâneos não zeram os ADMINs): lança
  // EmployeeError.lastAdmin se a corrida for perdida, e EmployeeError.notFound se o
  // funcionário sumiu.
  changeRole(employee: Employee): Promise<void>;
}
