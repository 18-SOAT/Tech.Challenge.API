import type { SharedContainer } from '../../shared/shared.container.js';
import { CreateServiceUseCase } from './application/use-cases/create-service.use-case.js';
import { DeleteServiceUseCase } from './application/use-cases/delete-service.use-case.js';
import { FindServiceByIdUseCase } from './application/use-cases/find-service-by-id.use-case.js';
import { ListServicesUseCase } from './application/use-cases/list-services.use-case.js';
import { UpdateServiceUseCase } from './application/use-cases/update-service.use-case.js';
import type { ServiceRepository } from './domain/repositories/service.repository.js';
import { PrismaServiceRepository } from './infrastructure/persistence/prisma-service.repository.js';

// Composition root do módulo: o único arquivo que liga port → adapter.
export function makeInventoryContainer(shared: SharedContainer) {
  const serviceRepository: ServiceRepository = new PrismaServiceRepository(
    shared.prisma,
  );

  return {
    createService: new CreateServiceUseCase(serviceRepository),
    listServices: new ListServicesUseCase(serviceRepository),
    findServiceById: new FindServiceByIdUseCase(serviceRepository),
    updateService: new UpdateServiceUseCase(serviceRepository),
    deleteService: new DeleteServiceUseCase(serviceRepository),
  };
}

export type InventoryUseCases = ReturnType<typeof makeInventoryContainer>;
