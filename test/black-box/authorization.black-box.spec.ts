import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import {
  type Customer,
  createEmployee,
  type Employee,
  loginEmployee,
  registerCustomer,
  SEED_ADMIN,
  SEED_MECHANIC,
} from './support/actors.js';
import { type Api, request, startApi } from './support/api.js';
import {
  type MatrixCase,
  type Profile,
  readAuthorizationMatrix,
  routesOf,
} from './support/authorization-matrix.js';
import {
  PASSWORD,
  PHONE,
  uniqueCpf,
  uniqueEmail,
  uniqueName,
  uniquePlate,
  uniqueSku,
} from './support/data.js';
import { prepareTestDatabase, resetWorld } from './support/database.js';
import {
  assign,
  createCustomer,
  createProduct,
  createService,
  createVehicle,
  openOrder,
  orderAwaitingApproval,
  orderInExecution,
  orderReadyToDeliver,
} from './support/fixtures.js';
import { extractAccessToken, waitForEmail } from './support/mailpit.js';

// Contrato: docs/testing/black-box.md, seção 1. Um caso por célula da matriz.
const cases = readAuthorizationMatrix();

interface World {
  api: Api;
  admin: Employee;
  assignee: Employee; // MECHANIC responsável pelas OS criadas aqui
  mechanic: Employee; // outro MECHANIC
  owner: Customer; // dono das Ordens criadas aqui
  customer: Customer; // outro cliente
}

type RouteRequest = { path: string; body?: unknown };

// Para cada rota, uma requisição válida e com recurso novo: a célula de sucesso
// passa e as de 401/403/404 falham só pela autorização. Recurso novo por caso
// deixa os casos independentes (DELETE não apaga o que outro caso usa).
const routeRequests: Record<string, (w: World) => Promise<RouteRequest>> = {
  'GET /health': async () => ({ path: '/health' }),
  'GET /openapi': async () => ({ path: '/openapi' }),

  'POST /auth/register': async () => ({
    path: '/auth/register',
    body: {
      email: uniqueEmail('registro'),
      password: PASSWORD,
      document: uniqueCpf(),
      phone: PHONE,
    },
  }),
  'POST /auth/login': async () => ({
    path: '/auth/login',
    body: SEED_ADMIN,
  }),
  'POST /auth/first-access': async () => ({
    path: '/auth/first-access',
    body: { document: uniqueCpf() },
  }),
  'POST /auth/password-reset': async () => ({
    path: '/auth/password-reset',
    body: { email: uniqueEmail('sem-login') },
  }),
  'POST /auth/set-password': async ({ api }) => {
    const { email } = await registerCustomer(api);
    await request(api, 'POST', '/auth/password-reset', { body: { email } });
    const token = extractAccessToken(
      await waitForEmail(email, { subject: 'Redefinição' }),
    );
    return {
      path: '/auth/set-password',
      body: { token, password: PASSWORD },
    };
  },
  'GET /auth/me': async () => ({ path: '/auth/me' }),

  'POST /employees': async () => ({
    path: '/employees',
    body: {
      name: uniqueName('Funcionário'),
      email: uniqueEmail('equipe'),
      role: 'MECHANIC',
    },
  }),
  'QUERY /employees': async () => ({ path: '/employees', body: {} }),
  'GET /employees/:id': async ({ assignee }) => ({
    path: `/employees/${assignee.employeeId}`,
  }),
  'PATCH /employees/:id/role': async ({ api, admin }) => {
    const created = await request(api, 'POST', '/employees', {
      token: admin.token,
      body: {
        name: uniqueName('Funcionário'),
        email: uniqueEmail('promovido'),
        role: 'MECHANIC',
      },
    });
    return {
      path: `/employees/${created.body.data.id}/role`,
      body: { role: 'ADMIN' },
    };
  },

  'POST /customers': async () => ({
    path: '/customers',
    body: {
      name: uniqueName('Cliente'),
      document: uniqueCpf(),
      email: uniqueEmail('balcao'),
    },
  }),
  'QUERY /customers': async () => ({ path: '/customers', body: {} }),
  'GET /customers/:id': async ({ owner }) => ({
    path: `/customers/${owner.customerId}`,
  }),
  'PATCH /customers/:id': async ({ api, admin }) => {
    const { id } = await createCustomer(api, admin.token);
    return { path: `/customers/${id}`, body: { name: uniqueName('Cliente') } };
  },
  'DELETE /customers/:id': async ({ api, admin }) => {
    const { id } = await createCustomer(api, admin.token);
    return { path: `/customers/${id}` };
  },

  'POST /vehicles': async ({ owner }) => ({
    path: '/vehicles',
    body: {
      customerId: owner.customerId,
      plate: uniquePlate(),
      brand: 'Fiat',
      model: 'Uno',
      year: 2015,
    },
  }),
  'QUERY /vehicles': async () => ({ path: '/vehicles', body: {} }),
  'GET /vehicles/:id': async ({ api, admin, owner }) => {
    const { id } = await createVehicle(api, admin.token, owner.customerId);
    return { path: `/vehicles/${id}` };
  },
  'PATCH /vehicles/:id': async ({ api, admin, owner }) => {
    const { id } = await createVehicle(api, admin.token, owner.customerId);
    return { path: `/vehicles/${id}`, body: { model: 'Palio' } };
  },
  'DELETE /vehicles/:id': async ({ api, admin, owner }) => {
    const { id } = await createVehicle(api, admin.token, owner.customerId);
    return { path: `/vehicles/${id}` };
  },

  'QUERY /services': async () => ({ path: '/services', body: {} }),
  'GET /services/:id': async ({ api, admin }) => {
    const { id } = await createService(api, admin.token);
    return { path: `/services/${id}` };
  },
  'POST /services': async () => ({
    path: '/services',
    body: { name: uniqueName('Serviço'), price: 80 },
  }),
  'PATCH /services/:id': async ({ api, admin }) => {
    const { id } = await createService(api, admin.token);
    return { path: `/services/${id}`, body: { price: 90 } };
  },
  'DELETE /services/:id': async ({ api, admin }) => {
    const { id } = await createService(api, admin.token);
    return { path: `/services/${id}` };
  },

  'QUERY /products': async () => ({ path: '/products', body: {} }),
  'GET /products/:id': async ({ api, admin }) => {
    const { id } = await createProduct(api, admin.token);
    return { path: `/products/${id}` };
  },
  'QUERY /products/:id/stock-movements': async ({ api, admin }) => {
    const { id } = await createProduct(api, admin.token, { stock: 5 });
    return { path: `/products/${id}/stock-movements`, body: {} };
  },
  'POST /products': async () => ({
    path: '/products',
    body: {
      sku: uniqueSku(),
      name: uniqueName('Peça'),
      type: 'SUPPLY',
      price: 20,
    },
  }),
  'PATCH /products/:id': async ({ api, admin }) => {
    const { id } = await createProduct(api, admin.token);
    return { path: `/products/${id}`, body: { price: 25 } };
  },
  'DELETE /products/:id': async ({ api, admin }) => {
    const { id } = await createProduct(api, admin.token);
    return { path: `/products/${id}` };
  },
  'POST /products/:id/stock/entries': async ({ api, admin }) => {
    const { id } = await createProduct(api, admin.token);
    return { path: `/products/${id}/stock/entries`, body: { quantity: 3 } };
  },
  'POST /products/:id/stock/adjustments': async ({ api, admin }) => {
    const { id } = await createProduct(api, admin.token, { stock: 5 });
    return {
      path: `/products/${id}/stock/adjustments`,
      body: { quantity: -1, reason: 'Avaria' },
    };
  },

  'POST /orders': async ({ api, admin, owner }) => {
    const vehicle = await createVehicle(api, admin.token, owner.customerId);
    return {
      path: '/orders',
      body: { document: owner.document, plate: vehicle.plate },
    };
  },
  'POST /orders/:id/service-orders': async ({ api, admin, owner }) => {
    const { orderId } = await openOrder(api, admin.token, owner);
    return { path: `/orders/${orderId}/service-orders`, body: {} };
  },
  'POST /orders/:id/deliver': async ({ api, admin, owner, assignee }) => {
    const { orderId } = await orderReadyToDeliver(
      api,
      admin.token,
      owner,
      assignee.employeeId,
    );
    return { path: `/orders/${orderId}/deliver` };
  },
  'QUERY /orders': async () => ({ path: '/orders', body: {} }),
  'GET /orders/:id': async ({ api, admin, owner }) => {
    const { orderId } = await openOrder(api, admin.token, owner);
    return { path: `/orders/${orderId}` };
  },

  'PATCH /service-orders/:id/assignee': async ({
    api,
    admin,
    owner,
    assignee,
  }) => {
    const { serviceOrderId } = await openOrder(api, admin.token, owner);
    return {
      path: `/service-orders/${serviceOrderId}/assignee`,
      body: { mechanicId: assignee.employeeId },
    };
  },
  'QUERY /service-orders/execution-time': async () => ({
    path: '/service-orders/execution-time',
    body: {},
  }),
  'QUERY /service-orders': async () => ({
    path: '/service-orders',
    body: {},
  }),
  'QUERY /service-orders/queue': async () => ({
    path: '/service-orders/queue',
    body: {},
  }),
  'GET /service-orders/:id': async (w) => {
    const { serviceOrderId } = await assignedOrder(w);
    return { path: `/service-orders/${serviceOrderId}` };
  },
  'POST /service-orders/:id/services': async (w) => {
    const { serviceOrderId } = await assignedOrder(w);
    const service = await createService(w.api, w.admin.token);
    return {
      path: `/service-orders/${serviceOrderId}/services`,
      body: { serviceId: service.id, quantity: 1 },
    };
  },
  'POST /service-orders/:id/products': async (w) => {
    const { serviceOrderId } = await assignedOrder(w);
    const product = await createProduct(w.api, w.admin.token);
    return {
      path: `/service-orders/${serviceOrderId}/products`,
      body: { productId: product.id, quantity: 1 },
    };
  },
  'PATCH /service-orders/:id/items/:itemId': async (w) => {
    const { serviceOrderId, serviceItemId } = await assignedOrder(w);
    return {
      path: `/service-orders/${serviceOrderId}/items/${serviceItemId}`,
      body: { quantity: 2 },
    };
  },
  'DELETE /service-orders/:id/items/:itemId': async (w) => {
    const { serviceOrderId, serviceItemId } = await assignedOrder(w);
    return {
      path: `/service-orders/${serviceOrderId}/items/${serviceItemId}`,
    };
  },
  'POST /service-orders/:id/complete-diagnosis': async (w) => {
    const { serviceOrderId } = await assignedOrder(w);
    return { path: `/service-orders/${serviceOrderId}/complete-diagnosis` };
  },
  'POST /service-orders/:id/finish': async ({
    api,
    admin,
    owner,
    assignee,
  }) => {
    const { serviceOrderId } = await orderInExecution(
      api,
      admin.token,
      owner,
      assignee.employeeId,
    );
    return { path: `/service-orders/${serviceOrderId}/finish` };
  },
  'POST /service-orders/:id/approve': async ({
    api,
    admin,
    owner,
    assignee,
  }) => {
    const { serviceOrderId } = await orderAwaitingApproval(
      api,
      admin.token,
      owner,
      assignee.employeeId,
    );
    return { path: `/service-orders/${serviceOrderId}/approve` };
  },
  'POST /service-orders/:id/reject': async ({
    api,
    admin,
    owner,
    assignee,
  }) => {
    const { serviceOrderId } = await orderAwaitingApproval(
      api,
      admin.token,
      owner,
      assignee.employeeId,
    );
    return { path: `/service-orders/${serviceOrderId}/reject` };
  },

  'GET /me/orders': async () => ({ path: '/me/orders' }),
  'GET /me/orders/:id': async ({ api, admin, owner }) => {
    const { orderId } = await openOrder(api, admin.token, owner);
    return { path: `/me/orders/${orderId}` };
  },
};

// OS do dono, em diagnóstico, atribuída ao MECHANIC responsável.
async function assignedOrder({ api, admin, owner, assignee }: World) {
  const order = await openOrder(api, admin.token, owner);
  await assign(api, admin.token, order.serviceOrderId, assignee.employeeId);
  return order;
}

function tokenOf(world: World, profile: Profile): string | undefined {
  return {
    ANONYMOUS: undefined,
    CUSTOMER: world.customer.token,
    CUSTOMER_OWNER: world.owner.token,
    MECHANIC: world.mechanic.token,
    MECHANIC_ASSIGNEE: world.assignee.token,
    ADMIN: world.admin.token,
  }[profile];
}

// Rotas do OpenAPI no formato da matriz: `{id}` → `:id`, sem barra final.
function openApiRoutes(spec: { paths: Record<string, object> }): string[] {
  return Object.entries(spec.paths).flatMap(([path, operations]) => {
    const normalized =
      path.replace(/\{(\w+)\}/g, ':$1').replace(/(.)\/$/, '$1') || '/';
    return Object.keys(operations).map(
      (method) => `${method.toUpperCase()} ${normalized}`,
    );
  });
}

describe('Matriz de autorização (docs/testing/black-box.md)', () => {
  let prisma: PrismaClient;
  const world = {} as World;

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
    await resetWorld(prisma);
    world.api = startApi();
    world.admin = await loginEmployee(world.api, SEED_ADMIN);
    world.assignee = await loginEmployee(world.api, SEED_MECHANIC);
    world.mechanic = await createEmployee(
      world.api,
      world.admin.token,
      'MECHANIC',
    );
    world.owner = await registerCustomer(world.api);
    world.customer = await registerCustomer(world.api);
  });

  afterAll(async () => {
    await world.api?.stop();
    await prisma?.$disconnect();
  });

  describe('contrato', () => {
    it('toda rota da matriz tem requisição montada, e vice-versa', () => {
      expect(Object.keys(routeRequests).sort()).toEqual(routesOf(cases).sort());
    });

    it('a matriz cobre todas as rotas do OpenAPI', async () => {
      const response = await fetch(`${world.api.baseUrl}/openapi/json`);
      const documented = openApiRoutes(
        (await response.json()) as { paths: Record<string, object> },
      );

      expect(documented.sort()).toEqual(
        routesOf(cases)
          .filter((route) => route !== 'GET /openapi')
          .sort(),
      );
    });
  });

  describe.each(routesOf(cases))('%s', (route) => {
    const rows = cases.filter((c) => c.route === route);

    it.each(
      rows.map((c): [string, number, MatrixCase] => [c.profile, c.expected, c]),
    )('%s → %d', async (_profile, expected, { method, profile }) => {
      const { path, body } = await (
        routeRequests[route] as (w: World) => Promise<RouteRequest>
      )(world);
      const response = await request(world.api, method, path, {
        token: tokenOf(world, profile),
        body,
      });

      expect(
        response.status,
        `${route} como ${profile}: ${response.body?.message ?? ''}`,
      ).toBe(expected);
    });
  });
});
