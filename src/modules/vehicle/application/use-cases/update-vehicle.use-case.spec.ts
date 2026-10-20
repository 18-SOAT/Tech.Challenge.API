import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryVehicleRepository } from '../../../../../test/fakes/in-memory-vehicle.repository.js';
import { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { VehicleErrorCode } from '../../domain/errors/vehicle.error.js';
import { UpdateVehicleUseCase } from './update-vehicle.use-case.js';

const makeVehicle = (id: string, plate: string) =>
  Vehicle.restore({
    id,
    customerId: 'customer-1',
    plate,
    brand: 'Fiat',
    model: 'Uno',
    year: 2010,
  });

describe('UpdateVehicleUseCase', () => {
  let vehicles: InMemoryVehicleRepository;
  let useCase: UpdateVehicleUseCase;

  beforeEach(async () => {
    vehicles = new InMemoryVehicleRepository();
    useCase = new UpdateVehicleUseCase(vehicles);
    await vehicles.save(makeVehicle('vehicle-1', 'ABC1234'));
    await vehicles.save(makeVehicle('vehicle-2', 'XYZ9876'));
  });

  it('converte a placa para Mercosul e persiste', async () => {
    const vehicle = await useCase.execute({
      id: 'vehicle-1',
      plate: 'abc-1c34',
    });

    expect(vehicle.plateValue).toBe('ABC1C34');
    expect((await vehicles.findById('vehicle-1'))?.plateValue).toBe('ABC1C34');
  });

  it('reenviar a própria placa não é conflito', async () => {
    const vehicle = await useCase.execute({
      id: 'vehicle-1',
      plate: 'abc-1234',
      model: 'Mille',
    });

    expect(vehicle.modelValue).toBe('Mille');
  });

  it('rejeita placa de outro veículo', async () => {
    await expect(
      useCase.execute({ id: 'vehicle-1', plate: 'XYZ9876' }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: VehicleErrorCode.LICENSE_PLATE_ALREADY_IN_USE,
      }),
    );
  });

  it('veículo inexistente → notFound', async () => {
    await expect(
      useCase.execute({ id: 'nao-existe', year: 2011 }),
    ).rejects.toThrow(
      expect.objectContaining({ code: VehicleErrorCode.NOT_FOUND }),
    );
  });
});
