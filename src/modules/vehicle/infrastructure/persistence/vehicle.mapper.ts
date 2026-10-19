import type {
  Prisma,
  Vehicle as PrismaVehicle,
} from '../../../../generated/prisma/client.js';
import { Vehicle } from '../../domain/entities/vehicle.entity.js';

export class VehicleMapper {
  static toEntity(record: PrismaVehicle): Vehicle {
    return Vehicle.restore({
      id: record.id,
      customerId: record.customerId,
      plate: record.plate,
      brand: record.brand,
      model: record.model,
      year: record.year,
    });
  }

  // Unchecked: recebe `customerId` como escalar (FK) em vez de `customer: { connect }`.
  static toObject(entity: Vehicle): Prisma.VehicleUncheckedCreateInput {
    return {
      id: entity.idValue,
      customerId: entity.customerIdValue,
      plate: entity.plateValue,
      brand: entity.brandValue,
      model: entity.modelValue,
      year: entity.yearValue,
    };
  }
}
