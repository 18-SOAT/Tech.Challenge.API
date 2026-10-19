import type { SharedContainer } from '../../shared/shared.container.js';
import type { CustomerRepository } from '../customer/domain/repositories/customer.repository.js';
import { PrismaCustomerRepository } from '../customer/infrastructure/persistence/prisma-customer.repository.js';
import { CreateVehicleUseCase } from './application/use-cases/create-vehicle.use-case.js';
import { DeleteVehicleUseCase } from './application/use-cases/delete-vehicle.use-case.js';
import { FindVehicleByIdUseCase } from './application/use-cases/find-vehicle-by-id.use-case.js';
import { ListVehiclesUseCase } from './application/use-cases/list-vehicles.use-case.js';
import { UpdateVehicleUseCase } from './application/use-cases/update-vehicle.use-case.js';
import type { VehicleRepository } from './domain/repositories/vehicle.repository.js';
import { PrismaVehicleRepository } from './infrastructure/persistence/prisma-vehicle.repository.js';

// Composition root do módulo: o único arquivo que liga port → adapter.
export function makeVehicleContainer(shared: SharedContainer) {
  const vehicleRepository: VehicleRepository = new PrismaVehicleRepository(
    shared.prisma,
  );
  const customerRepository: CustomerRepository = new PrismaCustomerRepository(
    shared.prisma,
  );

  return {
    createVehicle: new CreateVehicleUseCase(
      vehicleRepository,
      customerRepository,
    ),
    listVehicles: new ListVehiclesUseCase(vehicleRepository),
    findVehicleById: new FindVehicleByIdUseCase(vehicleRepository),
    updateVehicle: new UpdateVehicleUseCase(vehicleRepository),
    deleteVehicle: new DeleteVehicleUseCase(vehicleRepository),
  };
}

export type VehicleUseCases = ReturnType<typeof makeVehicleContainer>;
