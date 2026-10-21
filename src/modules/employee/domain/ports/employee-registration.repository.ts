import type { User } from '../../../user/domain/entities/user.entity.js';
import type { Employee } from '../entities/employee.entity.js';

// "Funcionário cadastrado" cria User (EMPLOYEE) + Employee numa transação: nunca sobra
// um login de funcionário sem perfil. Port nomeado pela operação (ver
// docs/code/patterns/repository.md#transações-port-nomeado-pela-operação).
export interface EmployeeRegistrationRepository {
  // Lança UserError.emailAlreadyInUse se o e-mail já é login de outra pessoa.
  register(user: User, employee: Employee): Promise<void>;
}
