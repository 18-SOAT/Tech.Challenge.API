import { t } from 'elysia';
import type { Vehicle } from '../../domain/entities/vehicle.entity.js';

// Whitelist do que a gestão enxerga do veículo.
export class VehicleResponseDto {
  private constructor(
    readonly id: string,
    readonly customerId: string,
    readonly plate: string,
    readonly brand: string,
    readonly model: string,
    readonly year: number,
  ) {}

  static fromEntity(vehicle: Vehicle): VehicleResponseDto {
    return new VehicleResponseDto(
      vehicle.idValue,
      vehicle.customerIdValue,
      vehicle.plateValue,
      vehicle.brandValue,
      vehicle.modelValue,
      vehicle.yearValue,
    );
  }
}

export const VehicleResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid', description: 'Id do Vehicle (UUID v7)' }),
    customerId: t.String({ format: 'uuid', description: 'Dono do veículo' }),
    plate: t.String({
      description: 'Placa na forma canônica: maiúscula, sem hífen',
      examples: ['ABC1D23'],
    }),
    brand: t.String({ examples: ['Fiat'] }),
    model: t.String({ examples: ['Uno'] }),
    year: t.Integer({ examples: [2015] }),
  },
  { title: 'Vehicle' },
);
