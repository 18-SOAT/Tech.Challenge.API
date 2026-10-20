import type { Prisma } from '../../../../generated/prisma/client.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  uniqueViolationFields,
} from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import type { Customer } from '../../domain/entities/customer.entity.js';
import { CustomerError } from '../../domain/errors/customer.error.js';
import type {
  CustomerFilter,
  CustomerRepository,
} from '../../domain/repositories/customer.repository.js';
import { CustomerMapper } from './customer.mapper.js';

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { id } });
    return record ? CustomerMapper.toEntity(record) : null;
  }

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

  async findMany(filter: CustomerFilter): Promise<Page<Customer>> {
    const where: Prisma.CustomerWhereInput = {
      document: filter.document,
      name: filter.name
        ? { contains: filter.name, mode: 'insensitive' }
        : undefined,
    };
    // Lote na mesma transação: total e página vêm do mesmo snapshot.
    const [total, records] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);
    return { items: records.map(CustomerMapper.toEntity), total };
  }

  async save(customer: Customer): Promise<void> {
    const data = CustomerMapper.toObject(customer);
    try {
      await this.prisma.customer.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      // Corrida entre o check do use case e o insert: o banco é a última barreira.
      if (uniqueViolationFields(error)?.includes('document')) {
        throw CustomerError.documentAlreadyInUse();
      }
      throw error;
    }
  }

  async delete(customer: Customer): Promise<void> {
    try {
      await this.prisma.customer.delete({ where: { id: customer.idValue } });
    } catch (error) {
      if (isForeignKeyViolation(error)) throw CustomerError.hasDependencies();
      if (isRecordNotFound(error)) throw CustomerError.notFound();
      throw error;
    }
  }
}
