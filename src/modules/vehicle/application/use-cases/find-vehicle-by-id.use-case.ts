import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { VehicleError } from '../../domain/errors/vehicle.error.js';
import type { VehicleRepository } from '../../domain/repositories/vehicle.repository.js';

export class FindVehicleByIdUseCase implements UseCase<string, Vehicle> {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  async execute(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) throw VehicleError.notFound();
    return vehicle;
  }
}
