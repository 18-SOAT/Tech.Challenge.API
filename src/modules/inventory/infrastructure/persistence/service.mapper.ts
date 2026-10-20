import type {
  Prisma,
  Service as PrismaService,
} from '../../../../generated/prisma/client.js';
import { Service } from '../../domain/entities/service.entity.js';

export class ServiceMapper {
  // Decimal(10,2) → number: o Money.fromReais do restore absorve o ruído do float.
  static toEntity(record: PrismaService): Service {
    return Service.restore({
      id: record.id,
      name: record.name,
      description: record.description,
      price: record.price.toNumber(),
      estimatedDurationMinutes: record.estimatedDurationMinutes,
      active: record.active,
    });
  }

  // Preço vai como string ("89.90"): o Prisma converte para Decimal sem arredondar.
  static toObject(entity: Service): Prisma.ServiceCreateInput {
    return {
      id: entity.idValue,
      name: entity.nameValue,
      description: entity.descriptionValue,
      price: entity.priceValue.toDecimalString(),
      estimatedDurationMinutes: entity.estimatedDurationMinutesValue,
      active: entity.isActive,
    };
  }
}
