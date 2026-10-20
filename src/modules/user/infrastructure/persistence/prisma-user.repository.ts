import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { User } from '../../domain/entities/user.entity.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { UserMapper } from './user.mapper.js';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? UserMapper.toEntity(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? UserMapper.toEntity(record) : null;
  }

  async replacePassword(
    user: User,
    previousHashedPassword: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.idValue, hashedPassword: previousHashedPassword },
      data: { hashedPassword: user.hashedPassword },
    });
    return count === 1;
  }
}
