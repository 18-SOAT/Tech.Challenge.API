import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { VehicleError } from '../../domain/errors/vehicle.error.js';
import type { VehicleRepository } from '../../domain/repositories/vehicle.repository.js';

export class DeleteVehicleUseCase implements UseCase<string, void> {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  async execute(id: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) throw VehicleError.notFound();

    // OS vinculadas ficam em outra tabela: o repository detecta pela FK.
    await this.vehicleRepository.delete(vehicle);
  }
}
