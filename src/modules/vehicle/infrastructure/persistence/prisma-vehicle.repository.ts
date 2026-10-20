import type { Prisma } from '../../../../generated/prisma/client.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  uniqueViolationFields,
} from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import { CustomerError } from '../../../customer/domain/errors/customer.error.js';
import type { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { VehicleError } from '../../domain/errors/vehicle.error.js';
import type {
  VehicleFilter,
  VehicleRepository,
} from '../../domain/repositories/vehicle.repository.js';
import { VehicleMapper } from './vehicle.mapper.js';

export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({ where: { id } });
    return record ? VehicleMapper.toEntity(record) : null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({ where: { plate } });
    return record ? VehicleMapper.toEntity(record) : null;
  }

  async findMany(filter: VehicleFilter): Promise<Page<Vehicle>> {
    const where: Prisma.VehicleWhereInput = {
      customerId: filter.customerId,
      plate: filter.plate,
    };
    // Lote na mesma transação: total e página vêm do mesmo snapshot.
    const [total, records] = await this.prisma.$transaction([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);
    return { items: records.map(VehicleMapper.toEntity), total };
  }

  async save(vehicle: Vehicle): Promise<void> {
    const data = VehicleMapper.toObject(vehicle);
    try {
      await this.prisma.vehicle.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      // Corridas com o check do use case: placa tomada ou cliente excluído no meio.
      if (uniqueViolationFields(error)?.includes('plate')) {
        throw VehicleError.licensePlateAlreadyInUse();
      }
      if (isForeignKeyViolation(error)) throw CustomerError.notFound();
      throw error;
    }
  }

  async delete(vehicle: Vehicle): Promise<void> {
    try {
      await this.prisma.vehicle.delete({ where: { id: vehicle.idValue } });
    } catch (error) {
      if (isForeignKeyViolation(error)) throw VehicleError.hasServiceOrders();
      if (isRecordNotFound(error)) throw VehicleError.notFound();
      throw error;
    }
  }
}
