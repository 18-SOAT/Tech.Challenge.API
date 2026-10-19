import { describe, expect, it } from 'bun:test';
import { InMemoryVehicleRepository } from '../../../../../test/fakes/in-memory-vehicle.repository.js';
import { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { VehicleErrorCode } from '../../domain/errors/vehicle.error.js';
import { FindVehicleByIdUseCase } from './find-vehicle-by-id.use-case.js';

describe('FindVehicleByIdUseCase', () => {
  it('devolve o veículo ou lança notFound', async () => {
    const vehicles = new InMemoryVehicleRepository();
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
    const useCase = new FindVehicleByIdUseCase(vehicles);

    expect((await useCase.execute('vehicle-1')).idValue).toBe('vehicle-1');
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      expect.objectContaining({ code: VehicleErrorCode.NOT_FOUND }),
    );
  });
});
