import { describe, expect, it } from 'bun:test';
import { request } from './support/api.js';
import { expectError } from './support/assertions.js';
import { uniquePlate } from './support/data.js';
import {
  createCustomer,
  createVehicle,
  openOrder,
} from './support/fixtures.js';
import { blackBoxSuite } from './support/suite.js';

// Cenários de docs/testing/black-box.md, seção 2 › vehicle.
const DUPLICATE_PLATE = 'Placa já cadastrada.';

describe('vehicle (docs/testing/black-box.md)', () => {
  const suite = blackBoxSuite();
  const call = (method: string, path: string, body?: unknown) =>
    request(suite.api, method, path, { token: suite.admin.token, body });
  const postVehicle = (customerId: string, body: object = {}) =>
    call('POST', '/vehicles', {
      customerId,
      plate: uniquePlate(),
      brand: 'Fiat',
      model: 'Uno',
      year: 2015,
      ...body,
    });
  const listIds = async (body: object) =>
    (await call('QUERY', '/vehicles', body)).body.data.items.map(
      ({ id }: { id: string }) => id,
    );
  const newCustomer = async () =>
    (await createCustomer(suite.api, suite.admin.token)).id;

  it('VEH-01: CRUD', async () => {
    const customerId = await newCustomer();
    const created = await postVehicle(customerId);
    expect(created.status).toBe(201);
    const { id, plate } = created.body.data;

    const read = await call('GET', `/vehicles/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.data).toEqual(created.body.data);

    const updated = await call('PATCH', `/vehicles/${id}`, { model: 'Palio' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.model).toBe('Palio');

    expect(await listIds({ customerId })).toEqual([id]);
    expect(await listIds({ plate })).toEqual([id]);

    const deleted = await call('DELETE', `/vehicles/${id}`);
    expect(deleted.status).toBe(200);
    expectError(
      await call('GET', `/vehicles/${id}`),
      404,
      'Veículo não encontrado.',
    );
  });

  it('VEH-02: formatos de placa', async () => {
    const customerId = await newCustomer();
    const cases = [
      ['ABC1234', 'ABC1234'], // padrão antigo
      ['DEF1G23', 'DEF1G23'], // Mercosul
      ['ghi-2h34', 'GHI2H34'], // minúsculas e hífen
    ];

    for (const [plate, stored] of cases) {
      const created = await postVehicle(customerId, { plate });
      expect(created.status).toBe(201);
      expect(created.body.data.plate).toBe(stored);
    }
  });

  it('VEH-03: placa inválida', async () => {
    const customerId = await newCustomer();

    for (const plate of ['AB1234', 'ABCD123', 'ABC12D3']) {
      expectError(await postVehicle(customerId, { plate }), 400);
    }
  });

  it('VEH-04: busca por placa normalizada', async () => {
    const created = await postVehicle(await newCustomer(), {
      plate: 'JKL3M45',
    });

    expect(await listIds({ plate: 'jkl-3m45' })).toEqual([
      created.body.data.id,
    ]);
  });

  it('VEH-05: placa duplicada', async () => {
    const customerId = await newCustomer();
    const plate = uniquePlate();
    await postVehicle(customerId, { plate });

    expectError(await postVehicle(customerId, { plate }), 409, DUPLICATE_PLATE);

    const other = await createVehicle(suite.api, suite.admin.token, customerId);
    expectError(
      await call('PATCH', `/vehicles/${other.id}`, { plate }),
      409,
      DUPLICATE_PLATE,
    );
  });

  it('VEH-06: cliente inexistente', async () => {
    expectError(
      await postVehicle(crypto.randomUUID()),
      404,
      'Cliente não encontrado.',
    );
  });

  it('VEH-07: ano', async () => {
    const customerId = await newCustomer();
    const currentYear = new Date().getFullYear();

    expectError(await postVehicle(customerId, { year: 1899 }), 400);
    expectError(await postVehicle(customerId, { year: currentYear + 2 }), 400);
    expect(
      (await postVehicle(customerId, { year: currentYear + 1 })).status,
    ).toBe(201);
  });

  it('VEH-08: exclusão com OS', async () => {
    const customer = await createCustomer(suite.api, suite.admin.token);
    const { vehicleId } = await openOrder(suite.api, suite.admin.token, {
      customerId: customer.id,
      document: customer.document,
    });

    expectError(
      await call('DELETE', `/vehicles/${vehicleId}`),
      409,
      'Veículo com ordens de serviço não pode ser excluído.',
    );
  });

  it('VEH-09: dono imutável', async () => {
    const owner = await newCustomer();
    const { id } = await createVehicle(suite.api, suite.admin.token, owner);

    const updated = await call('PATCH', `/vehicles/${id}`, {
      customerId: await newCustomer(),
      model: 'Palio',
    });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      customerId: owner,
      model: 'Palio',
    });
  });
});
