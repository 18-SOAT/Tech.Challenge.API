import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { Customer } from '../../domain/entities/customer.entity.js';
import type { CustomerRepository } from '../../domain/repositories/customer.repository.js';
import { CustomerMapper } from './customer.mapper.js';

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByDocument(document: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { document },
    });
    return record ? CustomerMapper.toEntity(record) : null;
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { userId },
    });
    return record ? CustomerMapper.toEntity(record) : null;
  }
}
