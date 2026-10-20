import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { CustomerError } from '../../../customer/domain/errors/customer.error.js';
import type { CustomerRepository } from '../../../customer/domain/repositories/customer.repository.js';
import { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { VehicleError } from '../../domain/errors/vehicle.error.js';
import type { VehicleRepository } from '../../domain/repositories/vehicle.repository.js';
import { LicensePlate } from '../../domain/value-objects/license-plate.vo.js';

export interface CreateVehicleInput {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
}

export class CreateVehicleUseCase
  implements UseCase<CreateVehicleInput, Vehicle>
{
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: CreateVehicleInput): Promise<Vehicle> {
    const plate = LicensePlate.create(input.plate);

    // O Vehicle só guarda o id do cliente: existir é checado aqui (I/O), não na entity.
    if (!(await this.customerRepository.findById(input.customerId))) {
      throw CustomerError.notFound();
    }
    if (await this.vehicleRepository.findByPlate(plate.value)) {
      throw VehicleError.licensePlateAlreadyInUse();
    }

    const vehicle = Vehicle.create({
      customerId: input.customerId,
      plate,
      brand: input.brand,
      model: input.model,
      year: input.year,
    });

    await this.vehicleRepository.save(vehicle);
    return vehicle;
  }
}
