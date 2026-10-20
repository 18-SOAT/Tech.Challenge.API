import type { Prisma } from '../../../../generated/prisma/client.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  uniqueViolationFields,
} from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import type { Service } from '../../domain/entities/service.entity.js';
import { ServiceError } from '../../domain/errors/service.error.js';
import type {
  ServiceFilter,
  ServiceRepository,
} from '../../domain/repositories/service.repository.js';
import { ServiceMapper } from './service.mapper.js';

export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Service | null> {
    const record = await this.prisma.service.findUnique({ where: { id } });
    return record ? ServiceMapper.toEntity(record) : null;
  }

  async findByName(name: string): Promise<Service | null> {
    const record = await this.prisma.service.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    return record ? ServiceMapper.toEntity(record) : null;
  }

  async findMany(filter: ServiceFilter): Promise<Page<Service>> {
    const where: Prisma.ServiceWhereInput = {
      name: filter.name
        ? { contains: filter.name, mode: 'insensitive' }
        : undefined,
      active: filter.active,
    };
    // Lote na mesma transação: total e página vêm do mesmo snapshot.
    const [total, records] = await this.prisma.$transaction([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);
    return { items: records.map(ServiceMapper.toEntity), total };
  }

  async save(service: Service): Promise<void> {
    const data = ServiceMapper.toObject(service);
    try {
      await this.prisma.service.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      // Corrida com o check do use case: o unique do banco é a última barreira.
      if (uniqueViolationFields(error)?.includes('name')) {
        throw ServiceError.nameAlreadyInUse();
      }
      throw error;
    }
  }

  async delete(service: Service): Promise<void> {
    try {
      await this.prisma.service.delete({ where: { id: service.idValue } });
    } catch (error) {
      // FK de service_items: o serviço já entrou em alguma OS.
      if (isForeignKeyViolation(error)) throw ServiceError.inUse();
      if (isRecordNotFound(error)) throw ServiceError.notFound();
      throw error;
    }
  }
}
