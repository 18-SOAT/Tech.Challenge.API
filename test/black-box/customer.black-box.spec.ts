import { describe, expect, it } from 'bun:test';
import { registerCustomer } from './support/actors.js';
import { type Api, request } from './support/api.js';
import { expectError } from './support/assertions.js';
import { PHONE, uniqueCpf, uniqueEmail, uniqueName } from './support/data.js';
import { createCustomer, createVehicle } from './support/fixtures.js';
import { blackBoxSuite } from './support/suite.js';

// Cenários de docs/testing/black-box.md, seção 2 › customer.
const postCustomer = (
  api: Api,
  token: string,
  body: Record<string, unknown> = {},
) =>
  request(api, 'POST', '/customers', {
    token,
    body: {
      name: uniqueName('Cliente'),
      document: uniqueCpf(),
      email: uniqueEmail('balcao'),
      phone: PHONE,
      ...body,
    },
  });

describe('customer (docs/testing/black-box.md)', () => {
  const suite = blackBoxSuite();
  const call = (method: string, path: string, body?: unknown) =>
    request(suite.api, method, path, { token: suite.admin.token, body });
  const listIds = async (body: object) =>
    (await call('QUERY', '/customers', body)).body.data.items.map(
      ({ id }: { id: string }) => id,
    );

  it('CUS-01: CRUD', async () => {
    const name = uniqueName('Maria Oliveira');
    const created = await postCustomer(suite.api, suite.admin.token, { name });
    expect(created.status).toBe(201);
    const { id, document } = created.body.data;

    const read = await call('GET', `/customers/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.data).toEqual(created.body.data);

    const renamed = uniqueName('Maria Souza');
    const updated = await call('PATCH', `/customers/${id}`, {
      name: renamed,
      phone: null,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: renamed, phone: null });

    expect(await listIds({ name: renamed.toLowerCase() })).toContain(id);
    expect(await listIds({ document })).toEqual([id]);

    const deleted = await call('DELETE', `/customers/${id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toBeNull();
    expectError(
      await call('GET', `/customers/${id}`),
      404,
      'Cliente não encontrado.',
    );
  });

  it('CUS-02: documento normalizado', async () => {
    const created = await postCustomer(suite.api, suite.admin.token, {
      document: '529.982.247-25',
    });

    expect(created.status).toBe(201);
    expect(created.body.data.document).toBe('52998224725');
  });

  it('CUS-03: validação do documento', async () => {
    const invalid = [
      '52998224724', // CPF com dígito errado
      '11111111111', // todos os dígitos iguais
      '11222333000180', // CNPJ com dígito errado
      '123456789012', // 12 dígitos
    ];

    for (const document of invalid) {
      expectError(
        await postCustomer(suite.api, suite.admin.token, { document }),
        400,
      );
    }
  });

  it('CUS-04: outras validações', async () => {
    for (const body of [
      { phone: '119876543' },
      { phone: '119876543210' },
      { email: 'joao@' },
    ]) {
      expectError(await postCustomer(suite.api, suite.admin.token, body), 400);
    }

    const { id } = await createCustomer(suite.api, suite.admin.token);
    expectError(await call('PATCH', `/customers/${id}`, {}), 400);
  });

  it('CUS-05: documento duplicado', async () => {
    const document = uniqueCpf();
    await postCustomer(suite.api, suite.admin.token, { document });

    expectError(
      await postCustomer(suite.api, suite.admin.token, { document }),
      409,
      'CPF/CNPJ já cadastrado.',
    );
  });

  it('CUS-06: documento imutável', async () => {
    const { id, document } = await createCustomer(suite.api, suite.admin.token);

    // O campo fora do schema é descartado: sem campo restante, o minProperties dá 400.
    expectError(
      await call('PATCH', `/customers/${id}`, { document: uniqueCpf() }),
      400,
    );

    const name = uniqueName('Novo nome');
    const updated = await call('PATCH', `/customers/${id}`, {
      document: uniqueCpf(),
      name,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name, document });
  });

  it('CUS-07: exclusão de cliente com login', async () => {
    const { customerId } = await registerCustomer(suite.api);

    expectError(
      await call('DELETE', `/customers/${customerId}`),
      409,
      'Cliente com acesso ativo não pode ser excluído.',
    );
  });

  it('CUS-08: exclusão de cliente com veículo', async () => {
    const { id } = await createCustomer(suite.api, suite.admin.token);
    await createVehicle(suite.api, suite.admin.token, id);

    expectError(
      await call('DELETE', `/customers/${id}`),
      409,
      'Cliente com veículos ou ordens de serviço não pode ser excluído.',
    );
  });

  it('CUS-09: paginação', async () => {
    for (const body of [{ limit: 0 }, { limit: 101 }, { page: 0 }]) {
      expectError(await call('QUERY', '/customers', body), 400);
    }
  });
});
