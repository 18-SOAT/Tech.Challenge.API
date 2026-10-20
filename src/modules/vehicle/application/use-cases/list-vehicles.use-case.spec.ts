import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryVehicleRepository } from '../../../../../test/fakes/in-memory-vehicle.repository.js';
import { Vehicle } from '../../domain/entities/vehicle.entity.js';
import { LicensePlate } from '../../domain/value-objects/license-plate.vo.js';
import { ListVehiclesUseCase } from './list-vehicles.use-case.js';

describe('ListVehiclesUseCase', () => {
  let useCase: ListVehiclesUseCase;

  beforeEach(async () => {
    const vehicles = new InMemoryVehicleRepository();
    useCase = new ListVehiclesUseCase(vehicles);
    for (const [customerId, plate] of [
      ['customer-1', 'ABC1234'],
      ['customer-1', 'ABC1D23'],
      ['customer-2', 'XYZ9876'],
    ]) {
      await vehicles.save(
        Vehicle.create({
          customerId,
          plate: LicensePlate.create(plate),
          brand: 'Fiat',
          model: 'Uno',
          year: 2015,
        }),
      );
    }
  });

  it('filtra pelos veículos do cliente, paginando', async () => {
    const page = await useCase.execute({
      page: 1,
      limit: 1,
      customerId: 'customer-1',
    });

    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
  });

  it('filtra por placa com minúscula e hífen', async () => {
    const page = await useCase.execute({
      page: 1,
      limit: 10,
      plate: 'xyz-9876',
    });

    expect(page.items.map((v) => v.customerIdValue)).toStrictEqual([
      'customer-2',
    ]);
  });
});
