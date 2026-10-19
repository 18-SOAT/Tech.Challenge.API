import { beforeEach, describe, expect, it } from 'bun:test';
import { Customer } from '../src/modules/customer/domain/entities/customer.entity.js';
import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { makeTestApp } from './fakes/make-test-app.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

const validCustomer = {
  name: 'João Silva',
  document: '529.982.247-25',
  email: 'Joao@Oficina.com',
  phone: '(11) 98765-4321',
};

const UNKNOWN_ID = '01920000-0000-7000-8000-000000000000';

describe('Customers (e2e)', () => {
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

  const create = async (body: object = validCustomer) =>
    (await readEnvelope(await call('/customers', { body }))).data;

  beforeEach(async () => {
    ctx = makeTestApp();
    adminToken = await employeeToken(EmployeeRole.ADMIN);
  });

  describe('acesso', () => {
    const routes = [
      { method: 'POST', path: '/customers', body: validCustomer },
      { method: 'QUERY', path: '/customers', body: { page: 1, limit: 10 } },
      { method: 'GET', path: `/customers/${UNKNOWN_ID}` },
      {
        method: 'PATCH',
        path: `/customers/${UNKNOWN_ID}`,
        body: { name: 'X' },
      },
      { method: 'DELETE', path: `/customers/${UNKNOWN_ID}` },
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

    it('403: cliente autenticado não acessa a gestão de clientes', async () => {
      const token = await ctx.tokens.sign({
        sub: 'user-1',
        email: 'joao@oficina.com',
        type: UserType.CUSTOMER,
        customerId: 'customer-1',
      });

      const response = await call('/customers', {
        method: 'QUERY',
        body: { page: 1, limit: 10 },
        token,
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /customers', () => {
    it('201: cadastra sem login e devolve só a whitelist', async () => {
      const response = await call('/customers', { body: validCustomer });
      const body = await readEnvelope(response);

      expect(response.status).toBe(201);
      expect(Object.keys(body.data).sort()).toStrictEqual(
        ['document', 'email', 'hasAccess', 'id', 'name', 'phone'].sort(),
      );
      expect(body.data).toMatchObject({
        name: 'João Silva',
        document: '52998224725',
        email: 'joao@oficina.com',
        phone: '11987654321',
        hasAccess: false,
      });
    });

    it('201: telefone é opcional', async () => {
      const { phone: _phone, ...withoutPhone } = validCustomer;

      const response = await call('/customers', { body: withoutPhone });

      expect(response.status).toBe(201);
      expect((await readEnvelope(response)).data.phone).toBeNull();
    });

    it('400: nome ausente, com a mensagem do schema', async () => {
      const { name: _name, ...withoutName } = validCustomer;

      const response = await call('/customers', { body: withoutName });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Informe o nome do cliente (até 120 caracteres).',
      );
    });

    it('400: CPF/CNPJ inválido', async () => {
      const response = await call('/customers', {
        body: { ...validCustomer, document: '123.456.789-00' },
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe('CPF/CNPJ inválido.');
    });

    it('409: CPF/CNPJ já cadastrado', async () => {
      await create();

      const response = await call('/customers', {
        body: { ...validCustomer, document: '52998224725' },
      });

      expect(response.status).toBe(409);
    });
  });

  describe('QUERY /customers', () => {
    beforeEach(async () => {
      await create();
      await create({
        ...validCustomer,
        name: 'Maria Souza',
        document: '11.222.333/0001-81',
      });
      await create({
        ...validCustomer,
        name: 'Joana Lima',
        document: '390.533.447-05',
      });
    });

    const query = (body: unknown) =>
      call('/customers', { method: 'QUERY', body });

    it('200: pagina e devolve total, page e limit', async () => {
      const response = await query({ page: 2, limit: 2 });
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data.total).toBe(3);
      expect(body.data.page).toBe(2);
      expect(body.data.limit).toBe(2);
      expect(body.data.items).toHaveLength(1);
    });

    it('200: page e limit têm valor padrão', async () => {
      const body = await readEnvelope(await query({}));

      expect(body.data).toMatchObject({ page: 1, limit: 20, total: 3 });
    });

    it('200: filtra por CPF/CNPJ com máscara', async () => {
      const body = await readEnvelope(
        await query({ page: 1, limit: 10, document: '11.222.333/0001-81' }),
      );

      expect(
        body.data.items.map((c: { name: string }) => c.name),
      ).toStrictEqual(['Maria Souza']);
    });

    it('200: filtra por parte do nome', async () => {
      const body = await readEnvelope(
        await query({ page: 1, limit: 10, name: 'jo' }),
      );

      expect(body.data.total).toBe(2);
    });

    it('400: limit acima de 100', async () => {
      const response = await query({ page: 1, limit: 101 });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'O limite deve ser um inteiro entre 1 e 100.',
      );
    });
  });

  describe('GET /customers/:id', () => {
    it('200: detalha o cliente', async () => {
      const { id } = await create();

      const response = await call(`/customers/${id}`);

      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data.id).toBe(id);
    });

    it('404: cliente inexistente', async () => {
      const response = await call(`/customers/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
      expect((await readEnvelope(response)).message).toBe(
        'Cliente não encontrado.',
      );
    });

    it('400: id que não é UUID', async () => {
      const response = await call('/customers/abc');

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Id de cliente inválido.',
      );
    });
  });

  describe('PATCH /customers/:id', () => {
    it('200: altera só os campos enviados; phone null remove', async () => {
      const { id } = await create();

      const response = await call(`/customers/${id}`, {
        method: 'PATCH',
        body: { email: 'novo@oficina.com', phone: null },
      });
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data).toMatchObject({
        name: 'João Silva',
        email: 'novo@oficina.com',
        phone: null,
        document: '52998224725',
      });
    });

    it('documento no body é descartado (imutável)', async () => {
      const { id } = await create();

      const response = await call(`/customers/${id}`, {
        method: 'PATCH',
        body: { name: 'João S.', document: '11222333000181' },
      });

      expect((await readEnvelope(response)).data.document).toBe('52998224725');
    });

    it('400: body sem nenhum campo', async () => {
      const { id } = await create();

      const response = await call(`/customers/${id}`, {
        method: 'PATCH',
        body: {},
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Informe ao menos um campo para alterar.',
      );
    });

    it('400: telefone inválido', async () => {
      const { id } = await create();

      const response = await call(`/customers/${id}`, {
        method: 'PATCH',
        body: { phone: '123' },
      });

      expect(response.status).toBe(400);
    });

    it('404: cliente inexistente', async () => {
      const response = await call(`/customers/${UNKNOWN_ID}`, {
        method: 'PATCH',
        body: { name: 'X' },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /customers/:id', () => {
    it('200: exclui e devolve data null', async () => {
      const { id } = await create();

      const response = await call(`/customers/${id}`, { method: 'DELETE' });
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data).toBeNull();
      expect(ctx.customers.items).toHaveLength(0);
    });

    it('409: cliente com login vinculado', async () => {
      const customer = Customer.restore({
        id: '01920000-0000-7000-8000-000000000001',
        userId: 'user-1',
        name: null,
        document: '52998224725',
        email: 'joao@oficina.com',
        phone: null,
      });
      await ctx.customers.save(customer);

      const response = await call(`/customers/${customer.idValue}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(409);
      expect((await readEnvelope(response)).message).toBe(
        'Cliente com acesso ativo não pode ser excluído.',
      );
    });

    it('409: cliente com veículo/OS vinculados', async () => {
      const { id } = await create();
      ctx.customers.withDependencies.add(id);

      const response = await call(`/customers/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(409);
    });

    it('404: cliente inexistente', async () => {
      const response = await call(`/customers/${UNKNOWN_ID}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });
});
