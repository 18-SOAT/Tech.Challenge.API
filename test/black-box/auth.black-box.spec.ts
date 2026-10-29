import { describe, expect, it } from 'bun:test';
import { registerCustomer } from './support/actors.js';
import { type Api, request, startApi } from './support/api.js';
import { expectError } from './support/assertions.js';
import { PASSWORD, PHONE, uniqueCpf, uniqueEmail } from './support/data.js';
import { createCustomer } from './support/fixtures.js';
import {
  expectEmptyInbox,
  extractAccessToken,
  waitForEmail,
} from './support/mailpit.js';
import { blackBoxSuite } from './support/suite.js';

// Cenários de docs/testing/black-box.md, seção 2 › auth.
const INVALID_CREDENTIALS = 'Credenciais inválidas.';
const LINK_INVALID =
  'Link de acesso inválido, expirado ou já utilizado. Solicite um novo.';
const NEW_PASSWORD = 'outra-senha-forte-456'; // gitleaks:allow (senha fictícia)

const register = (api: Api, body: Record<string, string> = {}) =>
  request(api, 'POST', '/auth/register', {
    body: {
      email: uniqueEmail('cliente'),
      password: PASSWORD,
      document: uniqueCpf(),
      phone: PHONE,
      ...body,
    },
  });

const loginAs = (api: Api, email: string, password: string) =>
  request(api, 'POST', '/auth/login', { body: { email, password } });

// Pede a redefinição e devolve o token que chegou no e-mail.
async function passwordResetToken(api: Api, email: string): Promise<string> {
  const response = await request(api, 'POST', '/auth/password-reset', {
    body: { email },
  });
  expect(response.status).toBe(202);
  return extractAccessToken(
    await waitForEmail(email, { subject: 'Redefinição de senha' }),
  );
}

// O limitador é em memória por instância: uma app nova começa com os contadores
// zerados. TRUST_PROXY deixa o teste escolher o IP pelo X-Forwarded-For.
async function withLimitedApi(run: (api: Api) => Promise<void>) {
  const api = startApi({ RATE_LIMIT_MAX: '3', TRUST_PROXY: 'true' });
  try {
    await run(api);
  } finally {
    await api.stop();
  }
}

const fromIp = (ip: string) => ({ 'x-forwarded-for': ip });

describe('auth (docs/testing/black-box.md)', () => {
  const suite = blackBoxSuite();

  it('AUTH-01: auto-cadastro e login', async () => {
    const email = uniqueEmail('cliente');

    const registered = await register(suite.api, { email });
    expect(registered.status).toBe(201);
    expect(registered.body.data).toMatchObject({ email, type: 'CUSTOMER' });

    const logged = await loginAs(suite.api, email, PASSWORD);
    expect(logged.status).toBe(200);
    expect(logged.body.data.accessToken).toBeString();

    const me = await request(suite.api, 'GET', '/auth/me', {
      token: logged.body.data.accessToken,
    });
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({
      email,
      type: 'CUSTOMER',
      customerId: expect.any(String),
    });
  });

  it('AUTH-02: cadastro com alias de e-mail em uso', async () => {
    expect(
      (await register(suite.api, { email: 'joaosilva@gmail.com' })).status,
    ).toBe(201);

    expectError(
      await register(suite.api, { email: 'j.o.a.o.silva+x@googlemail.com' }),
      409,
      'E-mail já cadastrado.',
    );
  });

  it('AUTH-03: login com alias', async () => {
    await register(suite.api, { email: 'joaosilva@gmail.com' });

    const logged = await loginAs(
      suite.api,
      'JoaoSilva+loja@gmail.com',
      PASSWORD,
    );

    expect(logged.status).toBe(200);
  });

  it('AUTH-04: alias não se aplica a domínio corporativo', async () => {
    expect(
      (await register(suite.api, { email: 'ana@empresa.com.br' })).status,
    ).toBe(201);

    expect(
      (await register(suite.api, { email: 'ana+x@empresa.com.br' })).status,
    ).toBe(201);
  });

  it('AUTH-05: credenciais inválidas', async () => {
    const { email } = await registerCustomer(suite.api);

    expectError(
      await loginAs(suite.api, uniqueEmail('inexistente'), PASSWORD),
      401,
      INVALID_CREDENTIALS,
    );
    expectError(
      await loginAs(suite.api, email, 'senha-errada-123'),
      401,
      INVALID_CREDENTIALS,
    );
  });

  it('AUTH-06: documento já cadastrado no balcão', async () => {
    const customer = await createCustomer(suite.api, suite.admin.token);

    expectError(
      await register(suite.api, { document: customer.document }),
      409,
      'CPF/CNPJ já cadastrado.',
    );
  });

  it('AUTH-07: primeiro acesso', async () => {
    const customer = await createCustomer(suite.api, suite.admin.token);

    const requested = await request(suite.api, 'POST', '/auth/first-access', {
      body: { document: customer.document },
    });
    expect(requested.status).toBe(202);

    const email = await waitForEmail(customer.email, {
      subject: 'Defina sua senha de acesso',
    });
    expect(email.to).toEqual([customer.email]);

    const defined = await request(suite.api, 'POST', '/auth/set-password', {
      body: { token: extractAccessToken(email), password: PASSWORD },
    });
    expect(defined.status).toBe(200);
    expect((await loginAs(suite.api, customer.email, PASSWORD)).status).toBe(
      200,
    );
  });

  it('AUTH-08: primeiro acesso sem enumeração', async () => {
    const withLogin = await registerCustomer(suite.api);

    for (const document of [uniqueCpf(), withLogin.document]) {
      const response = await request(suite.api, 'POST', '/auth/first-access', {
        body: { document },
      });
      expect(response.status).toBe(202);
    }
    await expectEmptyInbox();
  });

  it('AUTH-09: primeiro acesso com documento inválido', async () => {
    const response = await request(suite.api, 'POST', '/auth/first-access', {
      body: { document: '52998224724' },
    });

    expectError(response, 400);
  });

  it('AUTH-10: redefinição de senha', async () => {
    const { email } = await registerCustomer(suite.api);
    const token = await passwordResetToken(suite.api, email);

    const defined = await request(suite.api, 'POST', '/auth/set-password', {
      body: { token, password: NEW_PASSWORD },
    });

    expect(defined.status).toBe(200);
    expect((await loginAs(suite.api, email, NEW_PASSWORD)).status).toBe(200);
    expectError(await loginAs(suite.api, email, PASSWORD), 401);
  });

  it('AUTH-11: link de uso único', async () => {
    const { email } = await registerCustomer(suite.api);
    const token = await passwordResetToken(suite.api, email);
    const setPassword = () =>
      request(suite.api, 'POST', '/auth/set-password', {
        body: { token, password: NEW_PASSWORD },
      });

    expect((await setPassword()).status).toBe(200);
    expectError(await setPassword(), 400, LINK_INVALID);
  });

  it('AUTH-12: redefinição sem enumeração', async () => {
    const response = await request(suite.api, 'POST', '/auth/password-reset', {
      body: { email: uniqueEmail('sem-login') },
    });

    expect(response.status).toBe(202);
    await expectEmptyInbox();
  });

  it('AUTH-13: token inválido no set-password', async () => {
    const { email } = await registerCustomer(suite.api);
    const token = await passwordResetToken(suite.api, email);
    const [header, payload, signature = ''] = token.split('.');
    const tampered = `${header}.${payload}.${'A'.repeat(signature.length)}`;

    for (const candidate of [tampered, suite.admin.token]) {
      const response = await request(suite.api, 'POST', '/auth/set-password', {
        body: { token: candidate, password: NEW_PASSWORD },
      });
      expectError(response, 400, LINK_INVALID);
    }
  });

  it('AUTH-14: token do link não vale como Bearer', async () => {
    const { email } = await registerCustomer(suite.api);
    const token = await passwordResetToken(suite.api, email);

    expectError(await request(suite.api, 'GET', '/auth/me', { token }), 401);
  });

  it('AUTH-15: validação', async () => {
    expectError(await register(suite.api, { password: 'curta' }), 400);
    expectError(await register(suite.api, { email: 'joao@' }), 400);
    expectError(await register(suite.api, { phone: '119876543' }), 400);
  });

  describe('rate limit (app com limite 3)', () => {
    it('AUTH-16: rate limit por IP', async () => {
      await withLimitedApi(async (limited) => {
        const attempt = () =>
          request(limited, 'POST', '/auth/login', {
            body: { email: uniqueEmail('tentativa'), password: PASSWORD },
            headers: fromIp('203.0.113.10'),
          });
        for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);

        const blocked = await attempt();

        expectError(
          blocked,
          429,
          'Muitas tentativas. Aguarde e tente de novo.',
        );
        expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
      });
    });

    it('AUTH-17: rate limit por conta (e-mail canônico)', async () => {
      await registerCustomer(suite.api, { email: 'joaosilva@gmail.com' });
      const aliases = [
        'joaosilva@gmail.com',
        'joao.silva@gmail.com',
        'JoaoSilva+a@gmail.com',
        'j.o.a.o.silva+b@googlemail.com',
      ];

      await withLimitedApi(async (limited) => {
        const statuses = [];
        for (const [i, email] of aliases.entries()) {
          const response = await request(limited, 'POST', '/auth/login', {
            body: { email, password: PASSWORD },
            headers: fromIp(`203.0.113.${20 + i}`),
          });
          statuses.push(response.status);
        }

        // IPs diferentes e senha certa: só o contador da conta explica o 429.
        expect(statuses).toEqual([200, 200, 200, 429]);
      });
    });

    it('AUTH-18: rotas autenticadas fora do rate limit', async () => {
      await withLimitedApi(async (limited) => {
        for (let i = 0; i < 10; i++) {
          const me = await request(limited, 'GET', '/auth/me', {
            token: suite.admin.token,
            headers: fromIp('203.0.113.30'),
          });
          expect(me.status).toBe(200);
        }
      });
    });
  });
});
