import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { InMemoryVehicleRepository } from '../../../../../test/fakes/in-memory-vehicle.repository.js';
import { Customer } from '../../../customer/domain/entities/customer.entity.js';
import { CustomerErrorCode } from '../../../customer/domain/errors/customer.error.js';
import { VehicleErrorCode } from '../../domain/errors/vehicle.error.js';
import {
  type CreateVehicleInput,
  CreateVehicleUseCase,
} from './create-vehicle.use-case.js';

describe('CreateVehicleUseCase', () => {
  let vehicles: InMemoryVehicleRepository;
  let useCase: CreateVehicleUseCase;

  const input: CreateVehicleInput = {
    customerId: 'customer-1',
    plate: 'abc-1d23',
    brand: 'Fiat',
    model: 'Uno',
    year: 2015,
  };

  beforeEach(async () => {
    vehicles = new InMemoryVehicleRepository();
    const customers = new InMemoryCustomerRepository();
    await customers.save(
      Customer.restore({
        id: 'customer-1',
        userId: null,
        name: 'João Silva',
        document: '52998224725',
        email: 'joao@oficina.com',
        phone: null,
      }),
    );
    useCase = new CreateVehicleUseCase(vehicles, customers);
  });

  it('cadastra o veículo do cliente com a placa normalizada', async () => {
    const vehicle = await useCase.execute(input);

    expect(vehicles.items).toStrictEqual([vehicle]);
    expect(vehicle.customerIdValue).toBe('customer-1');
    expect(vehicle.plateValue).toBe('ABC1D23');
  });

  it('cliente inexistente → CustomerError.notFound', async () => {
    await expect(
      useCase.execute({ ...input, customerId: 'nao-existe' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.NOT_FOUND }),
    );
    expect(vehicles.items).toHaveLength(0);
  });

  it('rejeita placa já cadastrada, mesmo escrita diferente', async () => {
    await useCase.execute(input);

    await expect(
      useCase.execute({ ...input, plate: 'ABC1D23' }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: VehicleErrorCode.LICENSE_PLATE_ALREADY_IN_USE,
      }),
    );
  });

  it('rejeita placa inválida sem gravar nada', async () => {
    await expect(
      useCase.execute({ ...input, plate: 'ABCD123' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: VehicleErrorCode.INVALID_LICENSE_PLATE }),
    );
    expect(vehicles.items).toHaveLength(0);
  });
});
