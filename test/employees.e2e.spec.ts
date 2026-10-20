import { beforeEach, describe, expect, it } from 'bun:test';
import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { makeEmployee } from './fakes/auth-fixtures.js';
import { makeTestApp } from './fakes/make-test-app.js';
import { flushBackground } from './helpers/async.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

const UNKNOWN_ID = '01920000-0000-7000-8000-000000000000';
const ADMIN_ID = '01920000-0000-7000-8000-00000000a001';

const validEmployee = {
  name: 'Maria Souza',
  email: 'Maria@Oficina.com',
  role: 'MECHANIC',
};

describe('Employees (e2e)', () => {
  let ctx: ReturnType<typeof makeTestApp>;
  let adminToken: string;

  const employeeToken = (role: EmployeeRole) =>
    ctx.tokens.sign({
      sub: 'user-admin',
      email: 'admin@oficina.com',
      type: UserType.EMPLOYEE,
      employeeId: ADMIN_ID,
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

  const create = async (body: object = validEmployee) =>
    (await readEnvelope(await call('/employees', { body }))).data;

  const changeRole = (id: string, role: string) =>
    call(`/employees/${id}/role`, { method: 'PATCH', body: { role } });

  beforeEach(async () => {
    ctx = makeTestApp();
    adminToken = await employeeToken(EmployeeRole.ADMIN);
    // O ADMIN do seed: a oficina sempre tem um.
    ctx.employees.items.push(
      makeEmployee('user-admin', EmployeeRole.ADMIN, ADMIN_ID),
    );
  });

  describe('acesso', () => {
    const routes = [
      { method: 'POST', path: '/employees', body: validEmployee },
      { method: 'QUERY', path: '/employees', body: { page: 1, limit: 10 } },
      { method: 'GET', path: `/employees/${UNKNOWN_ID}` },
      {
        method: 'PATCH',
        path: `/employees/${UNKNOWN_ID}/role`,
        body: { role: 'ADMIN' },
      },
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

    it('403: cliente autenticado não acessa a gestão da equipe', async () => {
      const token = await ctx.tokens.sign({
        sub: 'user-1',
        email: 'joao@oficina.com',
        type: UserType.CUSTOMER,
        customerId: 'customer-1',
      });

      const response = await call('/employees', {
        method: 'QUERY',
        body: { page: 1, limit: 10 },
        token,
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /employees', () => {
    it('201: cadastra e devolve só a whitelist', async () => {
      const response = await call('/employees', { body: validEmployee });
      const body = await readEnvelope(response);

      expect(response.status).toBe(201);
      expect(Object.keys(body.data).sort()).toStrictEqual(
        ['email', 'id', 'name', 'role'].sort(),
      );
      expect(body.data).toMatchObject({
        name: 'Maria Souza',
        email: 'maria@oficina.com',
        role: 'MECHANIC',
      });
    });

    it('envia o link, que define a senha e libera o login como funcionário', async () => {
      await create();
      await flushBackground();

      expect(ctx.mailer.sent).toMatchObject([
        { kind: 'employee-access', to: 'maria@oficina.com' },
      ]);

      const set = await call('/auth/set-password', {
        body: { token: ctx.mailer.lastToken, password: 'senha-da-maria' },
        token: null,
      });
      expect(set.status).toBe(200);

      const login = await call('/auth/login', {
        body: { email: 'maria@oficina.com', password: 'senha-da-maria' },
        token: null,
      });
      expect(login.status).toBe(200);
      expect((await readEnvelope(login)).data.user).toMatchObject({
        type: 'EMPLOYEE',
        role: 'MECHANIC',
      });
    });

    it('o link vale uma vez', async () => {
      await create();
      await flushBackground();
      const token = ctx.mailer.lastToken;

      await call('/auth/set-password', {
        body: { token, password: 'senha-da-maria' },
        token: null,
      });
      const reused = await call('/auth/set-password', {
        body: { token, password: 'outra-senha' },
        token: null,
      });

      expect(reused.status).toBe(400);
    });

    it('400: papel inválido, com a mensagem do schema', async () => {
      const response = await call('/employees', {
        body: { ...validEmployee, role: 'CUSTOMER' },
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'Papel inválido: use ADMIN ou MECHANIC.',
      );
    });

    it('400: e-mail inválido', async () => {
      const response = await call('/employees', {
        body: { ...validEmployee, email: 'maria' },
      });

      expect(response.status).toBe(400);
    });

    it('400: nome só com espaços', async () => {
      const response = await call('/employees', {
        body: { ...validEmployee, name: '   ' },
      });

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe(
        'O nome do funcionário não pode ser vazio.',
      );
    });

    it('409: e-mail já é login de alguém', async () => {
      await create();

      const response = await call('/employees', {
        body: { ...validEmployee, name: 'Outra Maria' },
      });

      expect(response.status).toBe(409);
    });
  });

  describe('QUERY /employees', () => {
    it('200: lista em ordem de nome e filtra por papel', async () => {
      await create();
      await create({
        name: 'Bruno',
        email: 'bruno@oficina.com',
        role: 'ADMIN',
      });

      const all = await readEnvelope(
        await call('/employees', {
          method: 'QUERY',
          body: { page: 1, limit: 10 },
        }),
      );
      expect(all.data.total).toBe(3);
      expect(all.data.items.map((e: { name: string }) => e.name)).toStrictEqual(
        ['Bruno', 'Maria', 'Maria Souza'],
      );

      const mechanics = await readEnvelope(
        await call('/employees', {
          method: 'QUERY',
          body: { page: 1, limit: 10, role: 'MECHANIC' },
        }),
      );
      expect(mechanics.data).toMatchObject({
        total: 1,
        page: 1,
        limit: 10,
        items: [{ name: 'Maria Souza', role: 'MECHANIC' }],
      });
    });

    it('400: limite acima de 100', async () => {
      const response = await call('/employees', {
        method: 'QUERY',
        body: { page: 1, limit: 101 },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /employees/:id', () => {
    it('200: detalha', async () => {
      const { id } = await create();

      const response = await call(`/employees/${id}`);

      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data.id).toBe(id);
    });

    it('404: não encontrado', async () => {
      expect((await call(`/employees/${UNKNOWN_ID}`)).status).toBe(404);
    });

    it('400: id malformado', async () => {
      expect((await call('/employees/abc')).status).toBe(400);
    });
  });

  describe('PATCH /employees/:id/role', () => {
    it('200: promove o mecânico e permite rebaixar o ADMIN antigo', async () => {
      const { id } = await create();

      const promoted = await changeRole(id, 'ADMIN');
      expect(promoted.status).toBe(200);
      expect((await readEnvelope(promoted)).data.role).toBe('ADMIN');

      expect((await changeRole(ADMIN_ID, 'MECHANIC')).status).toBe(200);
    });

    it('409: não rebaixa o último ADMIN', async () => {
      const response = await changeRole(ADMIN_ID, 'MECHANIC');

      expect(response.status).toBe(409);
      expect((await readEnvelope(response)).message).toContain(
        'ao menos um ADMIN',
      );
    });

    it('404: não encontrado', async () => {
      expect((await changeRole(UNKNOWN_ID, 'ADMIN')).status).toBe(404);
    });

    it('400: papel inválido', async () => {
      const { id } = await create();
      expect((await changeRole(id, 'OWNER')).status).toBe(400);
    });
  });
});
