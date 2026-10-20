import { beforeEach, describe, expect, it } from 'bun:test';
import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { makeTestApp } from './fakes/make-test-app.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

const UNKNOWN_ID = '01920000-0000-7000-8000-000000000000';

describe('Vehicles (e2e)', () => {
  let ctx: ReturnType<typeof makeTestApp>;
  let adminToken: string;
  let customerId: string;

  const employeeToken = (role: EmployeeRole) =>
    ctx.tokens.sign({
      sub: 'user-admin',
      email: 'admin@oficina.com',
      type: UserType.EMPLOYEE,
      employeeId: 'employee-1',
      role,
    });

  const call = (
    path: string,
    init: { method?: string; body?: unknown; token?: string | null } = {},
  ) =>
    ctx.app.handle(
      jsonRequest(path, {
        ...init,
        token: init.token === null ? undefined : (init.token ?? adminToken),
      }),
    );

  const validVehicle = () => ({
    customerId,
    plate: 'abc-1d23',
    brand: 'Fiat',
    model: 'Uno',
    year: 2015,
  });

  const create = async (overrides: object = {}) =>
    (
      await readEnvelope(
        await call('/vehicles', { body: { ...validVehicle(), ...overrides } }),
      )
    ).data;

  beforeEach(async () => {
    ctx = makeTestApp();
    adminToken = await employeeToken(EmployeeRole.ADMIN);
    const customer = await readEnvelope(
      await call('/customers', {
        body: {
          name: 'João Silva',
          document: '529.982.247-25',
          email: 'joao@oficina.com',
        },
      }),
    );
    customerId = customer.data.id;
  });

  describe('acesso', () => {
    const routes = [
      { method: 'POST', path: '/vehicles', body: { plate: 'ABC1234' } },
      { method: 'QUERY', path: '/vehicles', body: { page: 1, limit: 10 } },
      { method: 'GET', path: `/vehicles/${UNKNOWN_ID}` },
      {
        method: 'PATCH',
        path: `/vehicles/${UNKNOWN_ID}`,
        body: { year: 2016 },
      },
      { method: 'DELETE', path: `/vehicles/${UNKNOWN_ID}` },
    ];

    it.each(routes)('401: $method $path sem token', async (route) => {
      const response = await call(route.path, { ...route, token: null });

      expect(response.status).toBe(401);
    });

    it.each(routes)('403: $method $path com MECHANIC', async (route) => {
      const token = await employeeToken(EmployeeRole.MECHANIC);
      const response = await call(route.path, { ...route, token });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /vehicles', () => {
    it('201: cadastra com a placa na forma canônica e só a whitelist', async () => {
      const response = await call('/vehicles', { body: validVehicle() });
      const body = await readEnvelope(response);

      expect(response.status).toBe(201);
      expect(Object.keys(body.data).sort()).toStrictEqual(
        ['brand', 'customerId', 'id', 'model', 'plate', 'year'].sort(),
      );
      expect(body.data).toMatchObject({
        customerId,
        plate: 'ABC1D23',
        brand: 'Fiat',
        model: 'Uno',
        year: 2015,
      });
    });

    it('201: aceita o padrão antigo de placa', async () => {
      expect((await create({ plate: 'ABC-1234' })).plate).toBe('ABC1234');
    });

    it('400: placa inválida, com a mensagem do schema', async () => {
      const response = await call('/vehicles', {
        body: { ...validVehicle(), plate: 'ABCD123' },
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Placa inválida. Use o padrão antigo (ABC1234) ou Mercosul (ABC1D23).',
      );
    });

    it('400: ano acima do ano seguinte (regra da entity)', async () => {
      const response = await call('/vehicles', {
        body: { ...validVehicle(), year: new Date().getFullYear() + 2 },
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toContain(
        'O ano do veículo deve estar entre 1900 e',
      );
    });

    it('404: cliente inexistente', async () => {
      const response = await call('/vehicles', {
        body: { ...validVehicle(), customerId: UNKNOWN_ID },
      });

      expect(response.status).toBe(404);
      expect((await readEnvelope(response)).message).toBe(
        'Cliente não encontrado.',
      );
    });

    it('409: placa já cadastrada, mesmo escrita diferente', async () => {
      await create();

      const response = await call('/vehicles', {
        body: { ...validVehicle(), plate: 'ABC1D23' },
      });

      expect(response.status).toBe(409);
    });
  });

  describe('QUERY /vehicles', () => {
    const query = (body: unknown) =>
      call('/vehicles', { method: 'QUERY', body });

    beforeEach(async () => {
      await create();
      await create({ plate: 'XYZ9876' });
    });

    it('200: lista os veículos do cliente com paginação', async () => {
      const body = await readEnvelope(
        await query({ page: 1, limit: 1, customerId }),
      );

      expect(body.data).toMatchObject({ total: 2, page: 1, limit: 1 });
      expect(body.data.items).toHaveLength(1);
    });

    it('200: busca por placa com minúscula e hífen', async () => {
      const body = await readEnvelope(await query({ plate: 'xyz-9876' }));

      expect(
        body.data.items.map((v: { plate: string }) => v.plate),
      ).toStrictEqual(['XYZ9876']);
    });

    it('400: placa inválida no filtro', async () => {
      const response = await query({ plate: '123' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /vehicles/:id', () => {
    it('200: detalha o veículo', async () => {
      const { id } = await create();

      const response = await call(`/vehicles/${id}`);

      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data.id).toBe(id);
    });

    it('404: veículo inexistente', async () => {
      const response = await call(`/vehicles/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
      expect((await readEnvelope(response)).message).toBe(
        'Veículo não encontrado.',
      );
    });

    it('400: id que não é UUID', async () => {
      const response = await call('/vehicles/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /vehicles/:id', () => {
    it('200: converte a placa para Mercosul e mantém o dono', async () => {
      const { id } = await create({ plate: 'ABC1234' });

      const response = await call(`/vehicles/${id}`, {
        method: 'PATCH',
        body: { plate: 'ABC-1C34', model: 'Mille' },
      });
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data).toMatchObject({
        plate: 'ABC1C34',
        model: 'Mille',
        brand: 'Fiat',
        customerId,
      });
    });

    it('customerId no body é descartado (dono fixo)', async () => {
      const { id } = await create();

      const response = await call(`/vehicles/${id}`, {
        method: 'PATCH',
        body: { year: 2016, customerId: UNKNOWN_ID },
      });

      expect((await readEnvelope(response)).data.customerId).toBe(customerId);
    });

    it('400: body sem nenhum campo', async () => {
      const { id } = await create();

      const response = await call(`/vehicles/${id}`, {
        method: 'PATCH',
        body: {},
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Informe ao menos um campo para alterar.',
      );
    });

    it('409: placa de outro veículo', async () => {
      const { id } = await create();
      await create({ plate: 'XYZ9876' });

      const response = await call(`/vehicles/${id}`, {
        method: 'PATCH',
        body: { plate: 'xyz-9876' },
      });

      expect(response.status).toBe(409);
    });

    it('404: veículo inexistente', async () => {
      const response = await call(`/vehicles/${UNKNOWN_ID}`, {
        method: 'PATCH',
        body: { year: 2016 },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /vehicles/:id', () => {
    it('200: exclui e devolve data null', async () => {
      const { id } = await create();

      const response = await call(`/vehicles/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data).toBeNull();
      expect(ctx.vehicles.items).toHaveLength(0);
    });

    it('409: veículo com ordens de serviço', async () => {
      const { id } = await create();
      ctx.vehicles.withServiceOrders.add(id);

      const response = await call(`/vehicles/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(409);
      expect((await readEnvelope(response)).message).toBe(
        'Veículo com ordens de serviço não pode ser excluído.',
      );
    });

    it('404: veículo inexistente', async () => {
      const response = await call(`/vehicles/${UNKNOWN_ID}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });
});
