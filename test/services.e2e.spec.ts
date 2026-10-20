import { beforeEach, describe, expect, it } from 'bun:test';
import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { makeTestApp } from './fakes/make-test-app.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

const UNKNOWN_ID = '01920000-0000-7000-8000-000000000000';

describe('Services (e2e)', () => {
  let ctx: ReturnType<typeof makeTestApp>;
  let adminToken: string;

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

  const validService = () => ({
    name: 'Troca de óleo',
    description: 'Óleo 5W30 e filtro',
    price: 89.9,
    estimatedDurationMinutes: 30,
  });

  const create = async (overrides: object = {}) =>
    (
      await readEnvelope(
        await call('/services', { body: { ...validService(), ...overrides } }),
      )
    ).data;

  beforeEach(async () => {
    ctx = makeTestApp();
    adminToken = await employeeToken(EmployeeRole.ADMIN);
  });

  describe('acesso', () => {
    const readRoutes = [
      { method: 'QUERY', path: '/services', body: { page: 1, limit: 10 } },
      { method: 'GET', path: `/services/${UNKNOWN_ID}` },
    ];
    const writeRoutes = [
      { method: 'POST', path: '/services', body: { name: 'X', price: 1 } },
      {
        method: 'PATCH',
        path: `/services/${UNKNOWN_ID}`,
        body: { price: 10 },
      },
      { method: 'DELETE', path: `/services/${UNKNOWN_ID}` },
    ];

    it.each([...readRoutes, ...writeRoutes])(
      '401: $method $path sem token',
      async (route) => {
        const response = await call(route.path, { ...route, token: null });

        expect(response.status).toBe(401);
      },
    );

    it.each([...readRoutes, ...writeRoutes])(
      '403: $method $path com token de cliente',
      async (route) => {
        const token = await ctx.tokens.sign({
          sub: 'user-1',
          email: 'joao@oficina.com',
          type: UserType.CUSTOMER,
          customerId: 'customer-1',
        });
        const response = await call(route.path, { ...route, token });

        expect(response.status).toBe(403);
      },
    );

    it.each(writeRoutes)(
      '403: $method $path com MECHANIC (só consulta)',
      async (route) => {
        const token = await employeeToken(EmployeeRole.MECHANIC);
        const response = await call(route.path, { ...route, token });

        expect(response.status).toBe(403);
      },
    );

    it('MECHANIC consulta o catálogo', async () => {
      const { id } = await create();
      const token = await employeeToken(EmployeeRole.MECHANIC);

      const list = await call('/services', {
        method: 'QUERY',
        body: {},
        token,
      });
      const detail = await call(`/services/${id}`, { token });

      expect(list.status).toBe(200);
      expect(detail.status).toBe(200);
    });
  });

  describe('POST /services', () => {
    it('201: cadastra ativo e devolve só a whitelist', async () => {
      const response = await call('/services', { body: validService() });
      const body = await readEnvelope(response);

      expect(response.status).toBe(201);
      expect(Object.keys(body.data).sort()).toStrictEqual(
        [
          'active',
          'description',
          'estimatedDurationMinutes',
          'id',
          'name',
          'price',
        ].sort(),
      );
      expect(body.data).toMatchObject({ ...validService(), active: true });
    });

    it('201: descrição e duração são opcionais (viram null)', async () => {
      const data = await create({
        description: undefined,
        estimatedDurationMinutes: undefined,
      });

      expect(data.description).toBeNull();
      expect(data.estimatedDurationMinutes).toBeNull();
    });

    it('400: preço com mais de 2 casas (regra do VO Money)', async () => {
      const response = await call('/services', {
        body: { ...validService(), price: 10.005 },
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Valor inválido. Informe reais a partir de 0, com até 2 casas decimais.',
      );
    });

    it('400: preço negativo, com a mensagem do schema', async () => {
      const response = await call('/services', {
        body: { ...validService(), price: -1 },
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Informe o preço em reais (a partir de 0).',
      );
    });

    it('400: nome só com espaços (regra da entity)', async () => {
      const response = await call('/services', {
        body: { ...validService(), name: '   ' },
      });

      expect(response.status).toBe(400);
    });

    it('409: nome já cadastrado, mesmo com outra caixa', async () => {
      await create();

      const response = await call('/services', {
        body: { ...validService(), name: 'TROCA DE ÓLEO' },
      });

      expect(response.status).toBe(409);
    });
  });

  describe('QUERY /services', () => {
    const query = (body: unknown) =>
      call('/services', { method: 'QUERY', body });

    beforeEach(async () => {
      await create();
      await create({ name: 'Troca de pastilha' });
      const { id } = await create({ name: 'Alinhamento' });
      await call(`/services/${id}`, {
        method: 'PATCH',
        body: { active: false },
      });
    });

    it('200: busca parcial por nome com paginação', async () => {
      const body = await readEnvelope(
        await query({ page: 1, limit: 1, name: 'TROCA' }),
      );

      expect(body.data).toMatchObject({ total: 2, page: 1, limit: 1 });
      expect(body.data.items).toHaveLength(1);
    });

    it('200: filtra só os ativos', async () => {
      const body = await readEnvelope(await query({ active: true }));

      expect(body.data.total).toBe(2);
    });

    it('400: filtro active que não é booleano', async () => {
      const response = await query({ active: 'sim' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /services/:id', () => {
    it('404: serviço inexistente', async () => {
      const response = await call(`/services/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
      expect((await readEnvelope(response)).message).toBe(
        'Serviço não encontrado.',
      );
    });

    it('400: id que não é UUID', async () => {
      const response = await call('/services/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /services/:id', () => {
    it('200: altera o preço e remove a descrição com null', async () => {
      const { id } = await create();

      const response = await call(`/services/${id}`, {
        method: 'PATCH',
        body: { price: 99.5, description: null },
      });
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data).toMatchObject({
        name: 'Troca de óleo',
        price: 99.5,
        description: null,
      });
    });

    it('200: desativa e reativa', async () => {
      const { id } = await create();
      const patch = (active: boolean) =>
        call(`/services/${id}`, { method: 'PATCH', body: { active } });

      expect((await readEnvelope(await patch(false))).data.active).toBe(false);
      expect((await readEnvelope(await patch(true))).data.active).toBe(true);
    });

    it('400: body sem nenhum campo', async () => {
      const { id } = await create();

      const response = await call(`/services/${id}`, {
        method: 'PATCH',
        body: {},
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Informe ao menos um campo para alterar.',
      );
    });

    it('409: nome de outro serviço', async () => {
      const { id } = await create();
      await create({ name: 'Alinhamento' });

      const response = await call(`/services/${id}`, {
        method: 'PATCH',
        body: { name: 'alinhamento' },
      });

      expect(response.status).toBe(409);
    });

    it('404: serviço inexistente', async () => {
      const response = await call(`/services/${UNKNOWN_ID}`, {
        method: 'PATCH',
        body: { price: 10 },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /services/:id', () => {
    it('200: exclui serviço nunca usado e devolve data null', async () => {
      const { id } = await create();

      const response = await call(`/services/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data).toBeNull();
      expect(ctx.services.items).toHaveLength(0);
    });

    it('409: serviço já usado em OS orienta a desativar', async () => {
      const { id } = await create();
      ctx.services.usedInServiceOrders.add(id);

      const response = await call(`/services/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(409);
      expect((await readEnvelope(response)).message).toBe(
        'Serviço já usado em ordens de serviço não pode ser excluído. Desative-o.',
      );
    });

    it('404: serviço inexistente', async () => {
      const response = await call(`/services/${UNKNOWN_ID}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });
});
