import { describe, expect, it } from 'bun:test';
import {
  createEmployee,
  loginEmployee,
  registerCustomer,
  SEED_MECHANIC,
} from './support/actors.js';
import { type Api, request } from './support/api.js';
import { expectError } from './support/assertions.js';
import { PASSWORD, uniqueEmail, uniqueName } from './support/data.js';
import { extractAccessToken, waitForEmail } from './support/mailpit.js';
import { blackBoxSuite } from './support/suite.js';

// Cenários de docs/testing/black-box.md, seção 2 › employee.
const postEmployee = (
  api: Api,
  token: string,
  body: Record<string, string> = {},
) =>
  request(api, 'POST', '/employees', {
    token,
    body: {
      name: uniqueName('Funcionário'),
      email: uniqueEmail('equipe'),
      role: 'MECHANIC',
      ...body,
    },
  });

const changeRole = (api: Api, token: string, id: string, role: string) =>
  request(api, 'PATCH', `/employees/${id}/role`, { token, body: { role } });

describe('employee (docs/testing/black-box.md)', () => {
  const suite = blackBoxSuite();

  it('EMP-01: cadastro com link de acesso', async () => {
    const email = uniqueEmail('mecanico');

    const created = await postEmployee(suite.api, suite.admin.token, { email });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ email, role: 'MECHANIC' });

    const welcome = await waitForEmail(email, {
      subject: 'Bem-vindo à equipe: defina sua senha',
    });
    const defined = await request(suite.api, 'POST', '/auth/set-password', {
      body: { token: extractAccessToken(welcome), password: PASSWORD },
    });
    expect(defined.status).toBe(200);

    const employee = await loginEmployee(suite.api, {
      email,
      password: PASSWORD,
    });
    const me = await request(suite.api, 'GET', '/auth/me', {
      token: employee.token,
    });
    expect(me.body.data).toMatchObject({
      type: 'EMPLOYEE',
      role: 'MECHANIC',
      employeeId: created.body.data.id,
    });
  });

  it('EMP-02: e-mail (ou alias) em uso', async () => {
    await registerCustomer(suite.api, { email: 'joaosilva@gmail.com' });

    expectError(
      await postEmployee(suite.api, suite.admin.token, {
        email: 'joao.silva+equipe@gmail.com',
      }),
      409,
      'E-mail já cadastrado.',
    );
  });

  it('EMP-03: link expirado ou perdido → redefinição de senha', async () => {
    const email = uniqueEmail('mecanico');
    await postEmployee(suite.api, suite.admin.token, { email });

    const requested = await request(suite.api, 'POST', '/auth/password-reset', {
      body: { email },
    });
    expect(requested.status).toBe(202);

    const reset = await waitForEmail(email, {
      subject: 'Redefinição de senha',
    });
    const defined = await request(suite.api, 'POST', '/auth/set-password', {
      body: { token: extractAccessToken(reset), password: PASSWORD },
    });
    expect(defined.status).toBe(200);
  });

  it('EMP-04: troca de papel', async () => {
    const mechanic = await createEmployee(
      suite.api,
      suite.admin.token,
      'MECHANIC',
    );

    const changed = await changeRole(
      suite.api,
      suite.admin.token,
      mechanic.employeeId,
      'ADMIN',
    );
    expect(changed.status).toBe(200);
    expect(changed.body.data.role).toBe('ADMIN');

    // A autorização lê o papel do token: o antigo continua MECHANIC até expirar.
    // Já o /auth/me relê o usuário do banco e mostra o papel novo.
    const listEmployees = (token: string) =>
      request(suite.api, 'QUERY', '/employees', { token, body: {} });
    expectError(await listEmployees(mechanic.token), 403);
    const oldMe = await request(suite.api, 'GET', '/auth/me', {
      token: mechanic.token,
    });
    expect(oldMe.body.data.role).toBe('ADMIN');

    const promoted = await loginEmployee(suite.api, {
      email: mechanic.email,
      password: PASSWORD,
    });
    expect((await listEmployees(promoted.token)).status).toBe(200);
  });

  it('EMP-05: mesmo papel', async () => {
    const mechanic = await loginEmployee(suite.api, SEED_MECHANIC);

    const changed = await changeRole(
      suite.api,
      suite.admin.token,
      mechanic.employeeId,
      'MECHANIC',
    );

    expect(changed.status).toBe(200);
    expect(changed.body.data.role).toBe('MECHANIC');
  });

  it('EMP-06: último ADMIN', async () => {
    expectError(
      await changeRole(
        suite.api,
        suite.admin.token,
        suite.admin.employeeId,
        'MECHANIC',
      ),
      409,
      'A oficina precisa de ao menos um ADMIN: promova outro funcionário antes de alterar o papel deste.',
    );
  });

  it('EMP-07: listagem e detalhe', async () => {
    for (const name of ['Carlos Lima', 'Ana Souza', 'Bruno Reis']) {
      await postEmployee(suite.api, suite.admin.token, { name });
    }
    const list = (body: object) =>
      request(suite.api, 'QUERY', '/employees', {
        token: suite.admin.token,
        body,
      });
    const names = (response: {
      body: { data: { items: { name: string }[] } };
    }) => response.body.data.items.map(({ name }) => name);

    const mechanics = await list({ role: 'MECHANIC' });
    expect(mechanics.status).toBe(200);
    // Ordenado por nome; o seed traz o MECHANIC "Mecânico".
    expect(names(mechanics)).toEqual([
      'Ana Souza',
      'Bruno Reis',
      'Carlos Lima',
      'Mecânico',
    ]);
    expect(names(await list({ name: 'bruno' }))).toEqual(['Bruno Reis']);

    expectError(
      await request(suite.api, 'GET', `/employees/${crypto.randomUUID()}`, {
        token: suite.admin.token,
      }),
      404,
      'Funcionário não encontrado.',
    );
  });

  it('EMP-08: validação', async () => {
    expectError(
      await postEmployee(suite.api, suite.admin.token, { role: 'OWNER' }),
      400,
    );
    expectError(
      await postEmployee(suite.api, suite.admin.token, { name: '' }),
      400,
    );
  });
});
