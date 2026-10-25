import { AuthError } from '../../src/modules/auth/domain/errors/auth.error.js';
import type { CustomerAccessActivationRepository } from '../../src/modules/auth/domain/ports/customer-access-activation.repository.js';
import type { Customer } from '../../src/modules/customer/domain/entities/customer.entity.js';
import type { User } from '../../src/modules/user/domain/entities/user.entity.js';
import { UserError } from '../../src/modules/user/domain/errors/user.error.js';
import type { InMemoryCustomerRepository } from './in-memory-customer.repository.js';
import type { InMemoryUserRepository } from './in-memory-user.repository.js';

// Tudo ou nada, como a transação do adapter Prisma: confere as condições antes de
// gravar qualquer coisa nos dois repositórios.
export class InMemoryCustomerAccessActivationRepository
  implements CustomerAccessActivationRepository
{
  // Simula outra requisição ter vinculado o cliente entre o check e a gravação.
  raceLost = false;

  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly customers: InMemoryCustomerRepository,
  ) {}

  async activate(user: User, customer: Customer): Promise<void> {
    if (this.raceLost) throw AuthError.accessLinkInvalid();
    if (
      this.users.items.some((u) => u.emailCanonical === user.emailCanonical)
    ) {
      throw UserError.emailAlreadyInUse();
    }
    this.users.items.push(user);
    await this.customers.save(customer);
  }
}
