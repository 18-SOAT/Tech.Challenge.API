import { beforeEach, describe, expect, it } from 'bun:test';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { makeCustomer, makeUser } from './fakes/auth-fixtures.js';
import { makeTestApp } from './fakes/make-test-app.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

const validRegister = {
  email: 'Joao@Oficina.com',
  password: 'senha-forte',
  document: '529.982.247-25',
  phone: '(11) 98765-4321',
};

describe('Auth (e2e)', () => {
  let ctx: ReturnType<typeof makeTestApp>;
  beforeEach(() => {
    ctx = makeTestApp();
  });

  const call = (request: Request) => ctx.app.handle(request);

  describe('POST /auth/register', () => {
    it('201: cria o cliente e devolve só a whitelist do User', async () => {
      const response = await call(
        jsonRequest('/auth/register', { body: validRegister }),
      );
      const body = await readEnvelope(response);

      expect(response.status).toBe(201);
      expect(body.status).toBe(201);
      expect(Object.keys(body.data).sort()).toStrictEqual(
        ['email', 'id', 'type'].sort(),
      );
      expect(body.data.email).toBe('joao@oficina.com');
      expect(body.data.type).toBe(UserType.CUSTOMER);
      expect(ctx.customers.items).toHaveLength(1);
    });

    it('400: CPF/CNPJ inválido, com a mensagem do schema', async () => {
      const response = await call(
        jsonRequest('/auth/register', {
          body: { ...validRegister, document: '123.456.789-00' },
        }),
      );

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe('CPF/CNPJ inválido.');
    });

    it('400: campo obrigatório ausente', async () => {
      const { phone: _phone, ...withoutPhone } = validRegister;
      const response = await call(
        jsonRequest('/auth/register', { body: withoutPhone }),
      );

      expect(response.status).toBe(400);
    });

    it('mass assignment: `type: EMPLOYEE` no body é descartado — vira CUSTOMER', async () => {
      const response = await call(
        jsonRequest('/auth/register', {
          body: { ...validRegister, type: UserType.EMPLOYEE },
        }),
      );

      expect(response.status).toBe(201);
      expect((await readEnvelope(response)).data.type).toBe(UserType.CUSTOMER);
    });

    it('409: e-mail já cadastrado', async () => {
      await call(jsonRequest('/auth/register', { body: validRegister }));
      const response = await call(
        jsonRequest('/auth/register', {
          body: { ...validRegister, document: '11222333000181' },
        }),
      );

      expect(response.status).toBe(409);
      expect((await readEnvelope(response)).message).toBe(
        'E-mail já cadastrado.',
      );
    });

    it('409: alias do mesmo e-mail (e-mail canônico), mesma resposta do e-mail em uso', async () => {
      await call(
        jsonRequest('/auth/register', {
          body: { ...validRegister, email: 'joaosilva@gmail.com' },
        }),
      );
      const response = await call(
        jsonRequest('/auth/register', {
          body: {
            ...validRegister,
            email: 'J.oao.Silva+2@googlemail.com',
            document: '11222333000181',
          },
        }),
      );

      expect(response.status).toBe(409);
      expect((await readEnvelope(response)).message).toBe(
        'E-mail já cadastrado.',
      );
    });

    it('409: CPF/CNPJ já cadastrado', async () => {
      await call(jsonRequest('/auth/register', { body: validRegister }));
      const response = await call(
        jsonRequest('/auth/register', {
          body: { ...validRegister, email: 'outro@oficina.com' },
        }),
      );

      expect(response.status).toBe(409);
      expect((await readEnvelope(response)).message).toBe(
        'CPF/CNPJ já cadastrado.',
      );
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(() => {
      ctx.users.items.push(makeUser());
      ctx.customers.items.push(makeCustomer('user-1'));
    });

    it('200: devolve accessToken e o usuário (claims)', async () => {
      const response = await call(
        jsonRequest('/auth/login', {
          body: { email: 'joao@oficina.com', password: 'senha-forte' },
        }),
      );
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data.accessToken).toBeString();
      expect(body.data.user).toStrictEqual({
        id: 'user-1',
        email: 'joao@oficina.com',
        type: UserType.CUSTOMER,
        customerId: 'customer-1',
      });
    });

    it('200: login com um alias do e-mail cadastrado', async () => {
      await call(
        jsonRequest('/auth/register', {
          body: {
            ...validRegister,
            email: 'joaosilva@gmail.com',
            document: '11222333000181',
          },
        }),
      );
      const response = await call(
        jsonRequest('/auth/login', {
          body: {
            email: 'joao.silva+oficina@googlemail.com',
            password: 'senha-forte',
          },
        }),
      );

      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data.user.email).toBe(
        'joaosilva@gmail.com',
      );
    });

    it('401: senha errada, com mensagem genérica', async () => {
      const response = await call(
        jsonRequest('/auth/login', {
          body: { email: 'joao@oficina.com', password: 'errada' },
        }),
      );

      expect(response.status).toBe(401);
      expect(await readEnvelope(response)).toStrictEqual({
        data: null,
        message: 'Credenciais inválidas.',
        status: 401,
      });
    });

    it('400: e-mail malformado', async () => {
      const response = await call(
        jsonRequest('/auth/login', {
          body: { email: 'joao', password: 'senha-forte' },
        }),
      );

      expect(response.status).toBe(400);
      expect((await readEnvelope(response)).message).toBe('E-mail inválido.');
    });
  });

  describe('GET /auth/me', () => {
    beforeEach(() => {
      ctx.users.items.push(makeUser());
      ctx.customers.items.push(makeCustomer('user-1'));
    });

    const loginToken = async () => {
      const response = await call(
        jsonRequest('/auth/login', {
          body: { email: 'joao@oficina.com', password: 'senha-forte' },
        }),
      );
      return (await readEnvelope(response)).data.accessToken as string;
    };

    it('200: com o token do login', async () => {
      const response = await call(
        jsonRequest('/auth/me', { token: await loginToken() }),
      );

      expect(response.status).toBe(200);
      expect((await readEnvelope(response)).data).toStrictEqual({
        id: 'user-1',
        email: 'joao@oficina.com',
        type: UserType.CUSTOMER,
        customerId: 'customer-1',
      });
    });

    it('401: sem token (rota protegida pelo guard do módulo)', async () => {
      const response = await call(jsonRequest('/auth/me'));

      expect(response.status).toBe(401);
      expect((await readEnvelope(response)).message).toBe(
        'Token de acesso ausente.',
      );
    });

    it('401: token inválido', async () => {
      const response = await call(jsonRequest('/auth/me', { token: 'lixo' }));

      expect(response.status).toBe(401);
    });

    it('401: usuário desativado depois da emissão do token', async () => {
      const token = await loginToken();
      ctx.users.items[0] = makeUser({ active: false });

      const response = await call(jsonRequest('/auth/me', { token }));

      expect(response.status).toBe(401);
      expect((await readEnvelope(response)).message).toBe(
        'Usuário não encontrado ou inativo.',
      );
    });
  });
});
