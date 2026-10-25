import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import { isEmailUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import type { Customer } from '../../../customer/domain/entities/customer.entity.js';
import type { User } from '../../../user/domain/entities/user.entity.js';
import { UserError } from '../../../user/domain/errors/user.error.js';
import { UserMapper } from '../../../user/infrastructure/persistence/user.mapper.js';
import { AuthError } from '../../domain/errors/auth.error.js';
import type { CustomerAccessActivationRepository } from '../../domain/ports/customer-access-activation.repository.js';

export class PrismaCustomerAccessActivationRepository
  implements CustomerAccessActivationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  // Transação interativa: o vínculo só acontece se o cliente AINDA não tem login.
  // Toda query usa o `tx` — com `this.prisma` ela ficaria fora do rollback.
  async activate(user: User, customer: Customer): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.create({ data: UserMapper.toObject(user) });

        // Update condicional: fecha a corrida de dois usos simultâneos do mesmo link.
        // O perdedor cai aqui e o rollback desfaz o User que ele acabou de criar.
        const { count } = await tx.customer.updateMany({
          where: { id: customer.idValue, userId: null },
          data: { userId: user.idValue },
        });
        if (count === 0) throw AuthError.accessLinkInvalid();
      });
    } catch (error) {
      // Corrida com o check de e-mail do use case: o banco é a última barreira.
      if (isEmailUniqueViolation(error)) {
        throw UserError.emailAlreadyInUse();
      }
      throw error;
    }
  }
}
