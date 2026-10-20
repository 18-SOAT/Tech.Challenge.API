import type { Vehicle } from '../../src/modules/vehicle/domain/entities/vehicle.entity.js';
import { VehicleError } from '../../src/modules/vehicle/domain/errors/vehicle.error.js';
import type {
  VehicleFilter,
  VehicleRepository,
} from '../../src/modules/vehicle/domain/repositories/vehicle.repository.js';
import type { Page } from '../../src/shared/domain/pagination.js';

export class InMemoryVehicleRepository implements VehicleRepository {
  readonly items: Vehicle[] = [];
  // Ids com OS vinculadas: simula a FK que o adapter Prisma traduz em erro.
  readonly withServiceOrders = new Set<string>();

  async findById(id: string): Promise<Vehicle | null> {
    return this.items.find((vehicle) => vehicle.idValue === id) ?? null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    return this.items.find((vehicle) => vehicle.plateValue === plate) ?? null;
  }

  async findMany(filter: VehicleFilter): Promise<Page<Vehicle>> {
    const matches = this.items.filter(
      (vehicle) =>
        (!filter.customerId || vehicle.customerIdValue === filter.customerId) &&
        (!filter.plate || vehicle.plateValue === filter.plate),
    );
    const start = (filter.page - 1) * filter.limit;
    return {
      items: matches.slice(start, start + filter.limit),
      total: matches.length,
    };
  }

  async save(vehicle: Vehicle): Promise<void> {
    const index = this.items.findIndex((v) => v.idValue === vehicle.idValue);
    if (index === -1) this.items.push(vehicle);
    else this.items[index] = vehicle;
  }

  async delete(vehicle: Vehicle): Promise<void> {
    if (this.withServiceOrders.has(vehicle.idValue)) {
      throw VehicleError.hasServiceOrders();
    }
    const index = this.items.findIndex((v) => v.idValue === vehicle.idValue);
    if (index !== -1) this.items.splice(index, 1);
  }
}
