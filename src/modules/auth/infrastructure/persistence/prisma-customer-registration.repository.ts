import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import {
  isEmailUniqueViolation,
  uniqueViolationFields,
} from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import type { Customer } from '../../../customer/domain/entities/customer.entity.js';
import { CustomerError } from '../../../customer/domain/errors/customer.error.js';
import { CustomerMapper } from '../../../customer/infrastructure/persistence/customer.mapper.js';
import type { User } from '../../../user/domain/entities/user.entity.js';
import { UserError } from '../../../user/domain/errors/user.error.js';
import { UserMapper } from '../../../user/infrastructure/persistence/user.mapper.js';
import type { CustomerRegistrationRepository } from '../../domain/ports/customer-registration.repository.js';

export class PrismaCustomerRegistrationRepository
  implements CustomerRegistrationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async register(user: User, customer: Customer): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.user.create({ data: UserMapper.toObject(user) }),
        this.prisma.customer.create({
          data: CustomerMapper.toObject(customer),
        }),
      ]);
    } catch (error) {
      // Corrida entre o check de unicidade do use case e este insert: o banco é a
      // última barreira, e o erro vira o mesmo DomainError que o use case lançaria.
      if (isEmailUniqueViolation(error)) throw UserError.emailAlreadyInUse();
      if (uniqueViolationFields(error)?.includes('document'))
        throw CustomerError.documentAlreadyInUse();
      throw error;
    }
  }
}
