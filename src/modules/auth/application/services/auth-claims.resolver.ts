import type { AuthTokenPayload } from '../../../../shared/infrastructure/jwt/token-service.port.js';
import type { CustomerRepository } from '../../../customer/domain/repositories/customer.repository.js';
import type { EmployeeRepository } from '../../../employee/domain/repositories/employee.repository.js';
import type { User } from '../../../user/domain/entities/user.entity.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';

// Fonte única dos claims: o login assina e devolve este objeto, e o /me devolve o mesmo
// formato lido na hora do banco — resposta e token nunca divergem.
export class AuthClaimsResolver {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  // null = User sem perfil vinculado (dado inconsistente). Quem chama decide o erro.
  async resolve(user: User): Promise<AuthTokenPayload | null> {
    const base = { sub: user.idValue, email: user.emailValue };

    if (user.typeValue === UserType.CUSTOMER) {
      const customer = await this.customerRepository.findByUserId(user.idValue);
      return customer
        ? { ...base, type: UserType.CUSTOMER, customerId: customer.idValue }
        : null;
    }

    const employee = await this.employeeRepository.findByUserId(user.idValue);
    return employee
      ? {
          ...base,
          type: UserType.EMPLOYEE,
          employeeId: employee.idValue,
          role: employee.roleValue,
        }
      : null;
  }
}
