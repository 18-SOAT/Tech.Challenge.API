import { type Api, request } from './api.js';
import { PASSWORD, PHONE, uniqueCpf, uniqueEmail, uniqueName } from './data.js';
import { extractAccessToken, waitForEmail } from './mailpit.js';

// Credenciais do seed (prisma/seed.ts), as mesmas documentadas no README.
export const SEED_ADMIN = {
  email: 'admin@oficina.com',
  password: 'admin12345',
};
export const SEED_MECHANIC = {
  email: 'mecanico@oficina.com',
  password: 'mecanico12345',
};

export interface Customer {
  token: string;
  customerId: string;
  email: string;
  document: string;
}

export interface Employee {
  token: string;
  employeeId: string;
  email: string;
}

// Todo token vem do login real: o teste nunca assina JWT.
export async function login(
  api: Api,
  email: string,
  password: string,
): Promise<string> {
  const { status, body } = await request(api, 'POST', '/auth/login', {
    body: { email, password },
  });
  if (status !== 200) {
    throw new Error(`Login de ${email} falhou: ${status} ${body?.message}`);
  }
  return body.data.accessToken;
}

async function me(api: Api, token: string) {
  const { body } = await request(api, 'GET', '/auth/me', { token });
  return body.data as { customerId?: string; employeeId?: string };
}

export async function loginEmployee(
  api: Api,
  { email, password }: { email: string; password: string },
): Promise<Employee> {
  const token = await login(api, email, password);
  const { employeeId } = await me(api, token);
  return { token, employeeId: employeeId as string, email };
}

// Cliente com login: auto-cadastro em /auth/register.
export async function registerCustomer(api: Api): Promise<Customer> {
  const email = uniqueEmail('cliente');
  const document = uniqueCpf();
  const { status, body } = await request(api, 'POST', '/auth/register', {
    body: { email, password: PASSWORD, document, phone: PHONE },
  });
  if (status !== 201) {
    throw new Error(`Cadastro de cliente falhou: ${status} ${body?.message}`);
  }
  const token = await login(api, email, PASSWORD);
  const { customerId } = await me(api, token);
  return { token, customerId: customerId as string, email, document };
}

// Funcionário pelo fluxo real: ADMIN cadastra → link no Mailpit → define a senha.
export async function createEmployee(
  api: Api,
  adminToken: string,
  role: 'ADMIN' | 'MECHANIC',
): Promise<Employee> {
  const email = uniqueEmail(role.toLowerCase());
  const created = await request(api, 'POST', '/employees', {
    token: adminToken,
    body: { name: uniqueName('Funcionário'), email, role },
  });
  if (created.status !== 201) {
    throw new Error(
      `Cadastro de funcionário falhou: ${created.status} ${created.body?.message}`,
    );
  }
  const token = extractAccessToken(await waitForEmail(email));
  const defined = await request(api, 'POST', '/auth/set-password', {
    body: { token, password: PASSWORD },
  });
  if (defined.status !== 200) {
    throw new Error(`set-password falhou: ${defined.status}`);
  }
  return loginEmployee(api, { email, password: PASSWORD });
}
