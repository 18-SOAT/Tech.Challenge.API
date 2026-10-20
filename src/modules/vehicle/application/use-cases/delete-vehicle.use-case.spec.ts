import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryVehicleRepository } from '../../../../../test/fakes/in-memory-vehicle.repository.js';
import { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { VehicleErrorCode } from '../../domain/errors/vehicle.error.js';
import { DeleteVehicleUseCase } from './delete-vehicle.use-case.js';

describe('DeleteVehicleUseCase', () => {
  let vehicles: InMemoryVehicleRepository;
  let useCase: DeleteVehicleUseCase;

  beforeEach(async () => {
    vehicles = new InMemoryVehicleRepository();
    useCase = new DeleteVehicleUseCase(vehicles);
    await vehicles.save(
      Vehicle.restore({
        id: 'vehicle-1',
        customerId: 'customer-1',
        plate: 'ABC1234',
        brand: 'Fiat',
        model: 'Uno',
        year: 2010,
      }),
    );
  });

  it('exclui veículo sem OS', async () => {
    await useCase.execute('vehicle-1');

    expect(vehicles.items).toHaveLength(0);
  });

  it('bloqueia veículo com OS vinculadas', async () => {
    vehicles.withServiceOrders.add('vehicle-1');

    await expect(useCase.execute('vehicle-1')).rejects.toThrow(
      expect.objectContaining({ code: VehicleErrorCode.HAS_SERVICE_ORDERS }),
    );
    expect(vehicles.items).toHaveLength(1);
  });

  it('veículo inexistente → notFound', async () => {
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      expect.objectContaining({ code: VehicleErrorCode.NOT_FOUND }),
    );
  });
});
