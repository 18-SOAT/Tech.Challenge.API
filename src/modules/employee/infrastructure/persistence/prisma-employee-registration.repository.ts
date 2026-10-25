import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import { isEmailUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import type { User } from '../../../user/domain/entities/user.entity.js';
import { UserError } from '../../../user/domain/errors/user.error.js';
import { UserMapper } from '../../../user/infrastructure/persistence/user.mapper.js';
import type { Employee } from '../../domain/entities/employee.entity.js';
import type { EmployeeRegistrationRepository } from '../../domain/ports/employee-registration.repository.js';
import { EmployeeMapper } from './employee.mapper.js';

export class PrismaEmployeeRegistrationRepository
  implements EmployeeRegistrationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  // Lote: as duas escritas são independentes, nenhuma lê o resultado da outra.
  async register(user: User, employee: Employee): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.user.create({ data: UserMapper.toObject(user) }),
        this.prisma.employee.create({
          data: EmployeeMapper.toObject(employee),
        }),
      ]);
    } catch (error) {
      // Corrida com o check de e-mail do use case: o banco é a última barreira.
      if (isEmailUniqueViolation(error)) {
        throw UserError.emailAlreadyInUse();
      }
      throw error;
    }
  }
}
