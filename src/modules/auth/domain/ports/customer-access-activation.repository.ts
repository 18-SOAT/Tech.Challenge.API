import type { Customer } from '../../../customer/domain/entities/customer.entity.js';
import type { User } from '../../../user/domain/entities/user.entity.js';

// Primeiro acesso, numa transação: cria o User e liga ao Customer. Port nomeado pela
// operação (ver docs/code/patterns/repository.md#transações-port-nomeado-pela-operação).
export interface CustomerAccessActivationRepository {
  // Lança AuthError.accessLinkInvalid se o cliente já ganhou um login nesse meio-tempo
  // (link usado duas vezes ao mesmo tempo) e UserError.emailAlreadyInUse se o e-mail
  // já é login de outra pessoa. Nos dois casos nada é gravado.
  activate(user: User, customer: Customer): Promise<void>;
}
