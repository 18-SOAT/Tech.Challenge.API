import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { Vehicle } from '../../domain/entities/vehicle.entity.js';
import type {
  VehicleFilter,
  VehicleRepository,
} from '../../domain/repositories/vehicle.repository.js';
import { normalizeLicensePlate } from '../../domain/validators/is-valid-license-plate.js';

export class ListVehiclesUseCase
  implements UseCase<VehicleFilter, Page<Vehicle>>
{
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  async execute(filter: VehicleFilter): Promise<Page<Vehicle>> {
    // A placa é persistida na forma canônica: a busca aceita minúscula e hífen.
    return this.vehicleRepository.findMany({
      ...filter,
      plate: filter.plate ? normalizeLicensePlate(filter.plate) : undefined,
    });
  }
}
