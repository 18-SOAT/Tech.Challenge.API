import { describe, expect, it } from 'bun:test';
import { Elysia, t } from 'elysia';
import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import type { AuthTokenPayload } from '../src/shared/infrastructure/jwt/token-service.port.js';
import {
  type AuthPlugin,
  authPlugin,
} from '../src/shared/presentation/auth/auth.plugin.js';
import { ok } from '../src/shared/presentation/http/envelope.js';
import { errorHandler } from '../src/shared/presentation/http/error-handler.plugin.js';
import '../src/shared/presentation/http/formats.js';
import { FakeTokenService } from './fakes/fake-token-service.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

// Conta as verificações de token: o guard do index.ts + `auth: true` no handler
// não podem verificar o mesmo token duas vezes (ver docs/code/patterns/controller.md).
class CountingTokenService extends FakeTokenService {
  verifyCalls = 0;
  override verify(token: string): Promise<AuthTokenPayload> {
    this.verifyCalls++;
    return super.verify(token);
  }
}

const customer: AuthTokenPayload = {
  sub: 'user-1',
  email: 'joao@oficina.com',
  type: UserType.CUSTOMER,
  customerId: 'customer-1',
};

// Handler no formato do padrão: arquivo próprio, `.use(auth)` + `auth: true` pra ter `user` tipado.
const whoAmIHandler = (auth: AuthPlugin) =>
  new Elysia().use(auth).get('/who', ({ user }) => ok({ sub: user.sub }), {
    auth: true,
  });

const adminOnlyHandler = (auth: AuthPlugin) =>
  new Elysia().use(auth).get('/admin', () => ok({ ok: true }), {
    auth: { roles: [EmployeeRole.ADMIN] },
  });

function makeApp() {
  const tokens = new CountingTokenService();
  const auth = authPlugin(tokens);
  const app = new Elysia().use(errorHandler).use(
    new Elysia({ prefix: '/mod' })
      .use(auth)
      .post('/public', ({ body }) => ok(body, 201), {
        body: t.Object(
          {
            document: t.String({
              format: 'cpf-cnpj',
              error: 'CPF/CNPJ inválido.',
            }),
          },
          { additionalProperties: false },
        ),
      })
      .guard({ auth: true }, (guarded) =>
        guarded.use(whoAmIHandler(auth)).use(adminOnlyHandler(auth)),
      ),
  );
  return { app, tokens };
}

const get = (path: string, token?: string) => jsonRequest(path, { token });

describe('base HTTP (e2e): errorHandler, envelope, formats e macro auth', () => {
  it('validação: mensagem do `error` do schema chega no envelope 400', async () => {
    const { app } = makeApp();
    const response = await app.handle(
      jsonRequest('/mod/public', { body: { document: '123.456.789-00' } }),
    );

    expect(response.status).toBe(400);
    expect(await readEnvelope(response)).toStrictEqual({
      data: null,
      message: 'CPF/CNPJ inválido.',
      status: 400,
    });
  });

  it('validação: campo fora do contrato é descartado antes do handler (normalize)', async () => {
    const { app } = makeApp();
    const response = await app.handle(
      jsonRequest('/mod/public', {
        body: { document: '52998224725', admin: true },
      }),
    );

    expect(response.status).toBe(201);
    expect((await readEnvelope(response)).data).toStrictEqual({
      document: '52998224725',
    });
  });

  it('sucesso: ok(data, 201) define o status e o envelope', async () => {
    const { app } = makeApp();
    const response = await app.handle(
      jsonRequest('/mod/public', { body: { document: '529.982.247-25' } }),
    );

    expect(response.status).toBe(201);
    expect(await readEnvelope(response)).toStrictEqual({
      data: { document: '529.982.247-25' },
      message: null,
      status: 201,
    });
  });

  it('guard + auth no handler: user tipado e token verificado UMA vez', async () => {
    const { app, tokens } = makeApp();
    const token = await tokens.sign(customer);

    const response = await app.handle(get('/mod/who', token));

    expect(response.status).toBe(200);
    expect((await readEnvelope(response)).data).toStrictEqual({
      sub: 'user-1',
    });
    expect(tokens.verifyCalls).toBe(1);
  });

  it('sem token → 401 AUTH_TOKEN_MISSING no envelope', async () => {
    const { app } = makeApp();
    const response = await app.handle(get('/mod/who'));

    expect(response.status).toBe(401);
    expect(await readEnvelope(response)).toStrictEqual({
      data: null,
      message: 'Token de acesso ausente.',
      status: 401,
    });
  });

  it('token inválido → 401', async () => {
    const { app } = makeApp();
    const response = await app.handle(get('/mod/who', 'lixo'));

    expect(response.status).toBe(401);
    expect((await readEnvelope(response)).message).toBe(
      'Token de acesso inválido ou expirado.',
    );
  });

  it('role: cliente em rota de ADMIN → 403; funcionário ADMIN → 200', async () => {
    const { app, tokens } = makeApp();

    const asCustomer = await app.handle(
      get('/mod/admin', await tokens.sign(customer)),
    );
    expect(asCustomer.status).toBe(403);

    const admin = await tokens.sign({
      sub: 'user-2',
      email: 'maria@oficina.com',
      type: UserType.EMPLOYEE,
      employeeId: 'employee-1',
      role: EmployeeRole.ADMIN,
    });
    expect((await app.handle(get('/mod/admin', admin))).status).toBe(200);
  });
});
