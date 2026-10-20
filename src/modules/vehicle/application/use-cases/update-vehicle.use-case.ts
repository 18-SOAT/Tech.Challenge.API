import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { VehicleError } from '../../domain/errors/vehicle.error.js';
import type { VehicleRepository } from '../../domain/repositories/vehicle.repository.js';
import { LicensePlate } from '../../domain/value-objects/license-plate.vo.js';

export interface UpdateVehicleInput {
  id: string;
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
}

export class UpdateVehicleUseCase
  implements UseCase<UpdateVehicleInput, Vehicle>
{
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  async execute(input: UpdateVehicleInput): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findById(input.id);
    if (!vehicle) throw VehicleError.notFound();

    const plate =
      input.plate === undefined ? undefined : LicensePlate.create(input.plate);

    // Unicidade só importa se a placa mudou para uma que pertence a outro veículo.
    if (plate && plate.value !== vehicle.plateValue) {
      const owner = await this.vehicleRepository.findByPlate(plate.value);
      if (owner && owner.idValue !== vehicle.idValue) {
        throw VehicleError.licensePlateAlreadyInUse();
      }
    }

    vehicle.update({
      plate,
      brand: input.brand,
      model: input.model,
      year: input.year,
    });

    await this.vehicleRepository.save(vehicle);
    return vehicle;
  }
}
