import { beforeEach, describe, expect, it } from 'bun:test';
import { makeCustomer, makeUser } from './fakes/auth-fixtures.js';
import { makeTestApp } from './fakes/make-test-app.js';
import { flushBackground } from './helpers/async.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

describe('Auth — link de acesso (e2e)', () => {
  let ctx: ReturnType<typeof makeTestApp>;
  beforeEach(() => {
    ctx = makeTestApp();
  });

  const call = (request: Request) => ctx.app.handle(request);
  const post = (path: string, body: unknown) =>
    call(jsonRequest(path, { body }));
  const login = (password: string) =>
    post('/auth/login', { email: 'joao@oficina.com', password });

  describe('POST /auth/first-access', () => {
    it('202 e mesmo corpo com ou sem cadastro (sem enumeração)', async () => {
      const unknown = await post('/auth/first-access', {
        document: '529.982.247-25',
      });
      ctx.customers.items.push(makeCustomer(null));
      const known = await post('/auth/first-access', {
        document: '529.982.247-25',
      });
      await flushBackground();

      expect(unknown.status).toBe(202);
      expect(known.status).toBe(202);
      expect(await readEnvelope(known)).toStrictEqual(
        await readEnvelope(unknown),
      );
      expect(ctx.mailer.sent).toHaveLength(1);
    });

    it('400: CPF/CNPJ inválido', async () => {
      const response = await post('/auth/first-access', { document: '123' });
      expect(response.status).toBe(400);
    });
  });

  describe('fluxo do primeiro acesso', () => {
    beforeEach(() => {
      ctx.customers.items.push(makeCustomer(null));
    });

    const requestLink = async () => {
      await post('/auth/first-access', { document: '52998224725' });
      await flushBackground();
      return ctx.mailer.lastToken;
    };

    it('define a senha pelo link e passa a fazer login', async () => {
      const token = await requestLink();

      const response = await post('/auth/set-password', {
        token,
        password: 'nova-senha',
      });
      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data).toBeNull();

      const logged = await login('nova-senha');
      expect(logged.status).toBe(200);
      expect((await readEnvelope(logged)).data.user.customerId).toBe(
        'customer-1',
      );
    });

    it('400: link reutilizado', async () => {
      const token = await requestLink();
      await post('/auth/set-password', { token, password: 'nova-senha' });

      const reused = await post('/auth/set-password', {
        token,
        password: 'outra-senha',
      });
      expect(reused.status).toBe(400);
      expect((await readEnvelope(reused)).message).toContain(
        'Link de acesso inválido',
      );
    });

    it('400: link expirado', async () => {
      const token = await requestLink();
      ctx.accessLinks.expired = true;

      const response = await post('/auth/set-password', {
        token,
        password: 'nova-senha',
      });
      expect(response.status).toBe(400);
      expect(ctx.users.items).toHaveLength(0);
    });

    it('link não vale como Bearer: 401 em rota protegida', async () => {
      const token = await requestLink();
      const response = await call(jsonRequest('/auth/me', { token }));
      expect(response.status).toBe(401);
    });
  });

  describe('fluxo da redefinição de senha', () => {
    beforeEach(() => {
      ctx.users.items.push(makeUser());
      ctx.customers.items.push(makeCustomer('user-1'));
    });

    it('202 e mesmo corpo com ou sem conta', async () => {
      const unknown = await post('/auth/password-reset', {
        email: 'ninguem@oficina.com',
      });
      const known = await post('/auth/password-reset', {
        email: 'joao@oficina.com',
      });
      await flushBackground();

      expect(known.status).toBe(202);
      expect(await readEnvelope(known)).toStrictEqual(
        await readEnvelope(unknown),
      );
      expect(ctx.mailer.sent).toHaveLength(1);
    });

    it('troca a senha: a nova loga, a antiga e o link deixam de valer', async () => {
      await post('/auth/password-reset', { email: 'joao@oficina.com' });
      await flushBackground();
      const token = ctx.mailer.lastToken;

      expect(
        (await post('/auth/set-password', { token, password: 'nova-senha' }))
          .status,
      ).toBe(200);
      expect((await login('nova-senha')).status).toBe(200);
      expect((await login('senha-forte')).status).toBe(401);
      expect(
        (await post('/auth/set-password', { token, password: 'outra-senha' }))
          .status,
      ).toBe(400);
    });

    it('400: e-mail inválido', async () => {
      const response = await post('/auth/password-reset', { email: 'x' });
      expect(response.status).toBe(400);
    });
  });

  it('400: senha fora da regra no set-password', async () => {
    const response = await post('/auth/set-password', {
      token: 'qualquer',
      password: 'curta',
    });
    expect(response.status).toBe(400);
  });
});
