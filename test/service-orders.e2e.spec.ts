import { beforeEach, describe, expect, it } from 'bun:test';
import { Customer } from '../src/modules/customer/domain/entities/customer.entity.js';
import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { OrderStatus } from '../src/modules/service-order/domain/enums/order-status.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { makeEmployee } from './fakes/auth-fixtures.js';
import { makeTestApp } from './fakes/make-test-app.js';
import {
  makeProduct,
  makeService,
  makeVehicle,
} from './fakes/service-order-fixtures.js';
import { flushBackground } from './helpers/async.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

const UNKNOWN_ID = '01920000-0000-7000-8000-000000000000';
const ADMIN_ID = '01920000-0000-7000-8000-00000000a001';
const MECHANIC_ID = '01920000-0000-7000-8000-00000000a002';
const OTHER_MECHANIC_ID = '01920000-0000-7000-8000-00000000a003';
const CUSTOMER_ID = '01920000-0000-7000-8000-00000000c001';
const VEHICLE_ID = '01920000-0000-7000-8000-00000000d001';
const SERVICE_ID = '01920000-0000-7000-8000-00000000e001';
const PRODUCT_ID = '01920000-0000-7000-8000-00000000f001';

const openBody = {
  document: '529.982.247-25',
  plate: 'abc-1d23',
  notes: 'Barulho na suspensão',
  services: [{ serviceId: SERVICE_ID, quantity: 1 }],
};

describe('Service Orders (e2e)', () => {
  let ctx: ReturnType<typeof makeTestApp>;
  let adminToken: string;
  let mechanicToken: string;

  const employeeToken = (employeeId: string, role: EmployeeRole) =>
    ctx.tokens.sign({
      sub: `user-${employeeId}`,
      email: 'equipe@oficina.com',
      type: UserType.EMPLOYEE,
      employeeId,
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

  // Abre a ordem e devolve o id da 1ª OS, já com o mecânico atribuído.
  const openAssigned = async () => {
    const opened = await readEnvelope(
      await call('/orders', { body: openBody }),
    );
    const serviceOrderId: string = opened.data.serviceOrder.id;
    await call(`/service-orders/${serviceOrderId}/assignee`, {
      method: 'PATCH',
      body: { mechanicId: MECHANIC_ID },
    });
    return { orderId: opened.data.order.id as string, serviceOrderId };
  };

  const customerToken = (customerId = CUSTOMER_ID) =>
    ctx.tokens.sign({
      sub: `user-${customerId}`,
      email: 'joao@cliente.com',
      type: UserType.CUSTOMER,
      customerId,
    });

  // Ordem aberta com 1 serviço + 2 filtros (saldo 10) e orçamento gerado.
  const openQuote = async () => {
    const ids = await openAssigned();
    await call(`/service-orders/${ids.serviceOrderId}/products`, {
      body: { productId: PRODUCT_ID, quantity: 2 },
      token: mechanicToken,
    });
    await call(`/service-orders/${ids.serviceOrderId}/complete-diagnosis`, {
      method: 'POST',
      token: mechanicToken,
    });
    return ids;
  };

  beforeEach(async () => {
    ctx = makeTestApp();
    adminToken = await employeeToken(ADMIN_ID, EmployeeRole.ADMIN);
    mechanicToken = await employeeToken(MECHANIC_ID, EmployeeRole.MECHANIC);
    ctx.employees.items.push(
      makeEmployee('user-admin', EmployeeRole.ADMIN, ADMIN_ID),
      makeEmployee('user-mech', EmployeeRole.MECHANIC, MECHANIC_ID),
      makeEmployee('user-mech-2', EmployeeRole.MECHANIC, OTHER_MECHANIC_ID),
    );
    ctx.customers.items.push(
      Customer.restore({
        id: CUSTOMER_ID,
        userId: null,
        name: 'João',
        document: '52998224725',
        email: 'joao@cliente.com',
        phone: null,
      }),
    );
    ctx.vehicles.items.push(makeVehicle(CUSTOMER_ID, VEHICLE_ID));
    ctx.services.items.push(makeService(SERVICE_ID));
    ctx.products.items.push(makeProduct(PRODUCT_ID));
  });

  describe('acesso', () => {
    const adminRoutes = [
      { method: 'POST', path: '/orders', body: openBody },
      {
        method: 'POST',
        path: `/orders/${UNKNOWN_ID}/service-orders`,
        body: {},
      },
      {
        method: 'PATCH',
        path: `/service-orders/${UNKNOWN_ID}/assignee`,
        body: { mechanicId: MECHANIC_ID },
      },
    ];
    const teamRoutes = [
      { method: 'GET', path: `/service-orders/${UNKNOWN_ID}` },
      {
        method: 'POST',
        path: `/service-orders/${UNKNOWN_ID}/services`,
        body: { serviceId: SERVICE_ID, quantity: 1 },
      },
      {
        method: 'POST',
        path: `/service-orders/${UNKNOWN_ID}/products`,
        body: { productId: PRODUCT_ID, quantity: 1 },
      },
      {
        method: 'PATCH',
        path: `/service-orders/${UNKNOWN_ID}/items/${UNKNOWN_ID}`,
        body: { quantity: 2 },
      },
      {
        method: 'DELETE',
        path: `/service-orders/${UNKNOWN_ID}/items/${UNKNOWN_ID}`,
      },
      {
        method: 'POST',
        path: `/service-orders/${UNKNOWN_ID}/complete-diagnosis`,
      },
    ];

    const decisionRoutes = [
      { method: 'POST', path: `/service-orders/${UNKNOWN_ID}/approve` },
      { method: 'POST', path: `/service-orders/${UNKNOWN_ID}/reject` },
    ];

    it.each([...adminRoutes, ...teamRoutes, ...decisionRoutes])(
      '401: $method $path sem token',
      async (route) => {
        const response = await call(route.path, { ...route, token: null });
        expect(response.status).toBe(401);
      },
    );

    it.each([...adminRoutes, ...teamRoutes])(
      '403: $method $path com token de CUSTOMER',
      async (route) => {
        const token = await ctx.tokens.sign({
          sub: 'user-c',
          email: 'joao@cliente.com',
          type: UserType.CUSTOMER,
          customerId: CUSTOMER_ID,
        });
        const response = await call(route.path, { ...route, token });
        expect(response.status).toBe(403);
      },
    );

    it.each(adminRoutes)('403: $method $path com MECHANIC', async (route) => {
      const response = await call(route.path, {
        ...route,
        token: mechanicToken,
      });
      expect(response.status).toBe(403);
    });

    it('403: outro mecânico não mexe na OS atribuída', async () => {
      const { serviceOrderId } = await openAssigned();
      const token = await employeeToken(
        OTHER_MECHANIC_ID,
        EmployeeRole.MECHANIC,
      );

      const responses = await Promise.all([
        call(`/service-orders/${serviceOrderId}`, { token }),
        call(`/service-orders/${serviceOrderId}/products`, {
          body: { productId: PRODUCT_ID, quantity: 1 },
          token,
        }),
        call(`/service-orders/${serviceOrderId}/complete-diagnosis`, {
          method: 'POST',
          token,
        }),
      ]);
      for (const response of responses) expect(response.status).toBe(403);
    });
  });

  describe('fluxo de criação da OS', () => {
    it('abre, atribui, inclui itens, corrige e gera o orçamento por e-mail', async () => {
      // 1. Atendente abre a ordem com o serviço pedido no balcão.
      const opened = await call('/orders', { body: openBody });
      expect(opened.status).toBe(201);
      const { data } = await readEnvelope(opened);
      expect(data.order).toMatchObject({
        number: 1,
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
        status: 'RECEIVED',
        notes: 'Barulho na suspensão',
      });
      expect(data.serviceOrder).toMatchObject({
        status: 'IN_DIAGNOSIS',
        assigneeId: null,
        total: 89.9,
      });
      const serviceOrderId: string = data.serviceOrder.id;

      // 2. Atendente atribui o mecânico.
      const assigned = await call(
        `/service-orders/${serviceOrderId}/assignee`,
        {
          method: 'PATCH',
          body: { mechanicId: MECHANIC_ID },
        },
      );
      expect(assigned.status).toBe(200);
      expect((await readEnvelope(assigned)).data.assigneeId).toBe(MECHANIC_ID);

      // 3. Mecânico inclui peça, corrige a quantidade e remove o serviço repetido.
      const withProduct = await readEnvelope(
        await call(`/service-orders/${serviceOrderId}/products`, {
          body: { productId: PRODUCT_ID, quantity: 1 },
          token: mechanicToken,
        }),
      );
      const productItemId: string = withProduct.data.products[0].id;
      const changed = await call(
        `/service-orders/${serviceOrderId}/items/${productItemId}`,
        { method: 'PATCH', body: { quantity: 2 }, token: mechanicToken },
      );
      expect((await readEnvelope(changed)).data.total).toBe(160.9);

      const withExtra = await readEnvelope(
        await call(`/service-orders/${serviceOrderId}/services`, {
          body: { serviceId: SERVICE_ID, quantity: 1 },
          token: mechanicToken,
        }),
      );
      expect(withExtra.data.services[0].quantity).toBe(2);
      const removed = await call(
        `/service-orders/${serviceOrderId}/items/${productItemId}`,
        { method: 'DELETE', token: mechanicToken },
      );
      expect((await readEnvelope(removed)).data.products).toHaveLength(0);
      await call(`/service-orders/${serviceOrderId}/products`, {
        body: { productId: PRODUCT_ID, quantity: 2 },
        token: mechanicToken,
      });

      // 4. Mecânico conclui o diagnóstico: orçamento gerado e enviado.
      const completed = await call(
        `/service-orders/${serviceOrderId}/complete-diagnosis`,
        { method: 'POST', token: mechanicToken },
      );
      expect(completed.status).toBe(200);
      const quote = (await readEnvelope(completed)).data;
      expect(quote.status).toBe('AWAITING_APPROVAL');
      expect(quote.total).toBe(250.8);
      expect(
        quote.history.map((row: { status: string }) => row.status),
      ).toEqual(['IN_DIAGNOSIS', 'AWAITING_APPROVAL']);

      await flushBackground();
      expect(ctx.quoteMailer.sent).toHaveLength(1);
      expect(ctx.quoteMailer.sent[0]?.to).toBe('joao@cliente.com');
      expect(ctx.quoteMailer.sent[0]?.total.value).toBe(250.8);

      // 5. Depois do orçamento, os itens ficam travados.
      const locked = await call(`/service-orders/${serviceOrderId}/services`, {
        body: { serviceId: SERVICE_ID, quantity: 1 },
        token: mechanicToken,
      });
      expect(locked.status).toBe(409);

      // 6. O detalhe mostra a OS como ficou.
      const detail = await call(`/service-orders/${serviceOrderId}`, {
        token: mechanicToken,
      });
      expect(detail.status).toBe(200);
      expect((await readEnvelope(detail)).data.total).toBe(250.8);
    });

    it('reparo adicional: nova OS na mesma ordem', async () => {
      const { orderId } = await openAssigned();

      const response = await call(`/orders/${orderId}/service-orders`, {
        body: { description: 'Barulho no freio' },
      });

      expect(response.status).toBe(201);
      const { data } = await readEnvelope(response);
      expect(data).toMatchObject({
        orderId,
        status: 'IN_DIAGNOSIS',
        description: 'Barulho no freio',
        services: [],
      });
      expect(ctx.serviceOrders.items).toHaveLength(2);
    });
  });

  describe('decisão do orçamento', () => {
    it('o cliente aprova: valor congelado, estoque baixado e Ordem em andamento', async () => {
      const { orderId, serviceOrderId } = await openQuote();

      const response = await call(`/service-orders/${serviceOrderId}/approve`, {
        method: 'POST',
        token: await customerToken(),
      });

      expect(response.status).toBe(200);
      const { data } = await readEnvelope(response);
      expect(data).toMatchObject({
        status: 'IN_EXECUTION',
        total: 160.9,
        approvedAmount: 160.9,
      });
      expect(data.approvedAt).toBeString();
      expect(data.history.at(-1)).toMatchObject({
        status: 'IN_EXECUTION',
        changedById: null,
      });
      expect(ctx.products.items[0]?.stockQuantityValue).toBe(8);
      expect(ctx.stockMovements.items).toHaveLength(1);
      const order = await ctx.orders.findById(orderId);
      expect(order?.statusValue).toBe(OrderStatus.IN_PROGRESS);
    });

    it('o ADMIN rejeita pelo cliente; decidir de novo dá 409', async () => {
      const { serviceOrderId } = await openQuote();

      const rejected = await call(`/service-orders/${serviceOrderId}/reject`, {
        method: 'POST',
      });
      expect(rejected.status).toBe(200);
      const { data } = await readEnvelope(rejected);
      expect(data.status).toBe('REJECTED');
      expect(data.history.at(-1).changedById).toBe(ADMIN_ID);
      expect(ctx.products.items[0]?.stockQuantityValue).toBe(10);

      const again = await call(`/service-orders/${serviceOrderId}/approve`, {
        method: 'POST',
      });
      expect(again.status).toBe(409);
    });

    it('409 com saldo insuficiente: a OS continua aguardando aprovação', async () => {
      const { serviceOrderId } = await openQuote();
      ctx.products.setStock(PRODUCT_ID, 1);

      const response = await call(`/service-orders/${serviceOrderId}/approve`, {
        method: 'POST',
        token: await customerToken(),
      });

      expect(response.status).toBe(409);
      const detail = await readEnvelope(
        await call(`/service-orders/${serviceOrderId}`),
      );
      expect(detail.data).toMatchObject({
        status: 'AWAITING_APPROVAL',
        approvedAmount: null,
      });
      expect(ctx.products.items[0]?.stockQuantityValue).toBe(1);
    });

    it('403 para outro cliente e para o MECHANIC', async () => {
      const { serviceOrderId } = await openQuote();

      const responses = await Promise.all([
        call(`/service-orders/${serviceOrderId}/approve`, {
          method: 'POST',
          token: await customerToken(UNKNOWN_ID),
        }),
        call(`/service-orders/${serviceOrderId}/reject`, {
          method: 'POST',
          token: mechanicToken,
        }),
      ]);
      for (const response of responses) expect(response.status).toBe(403);
    });

    it('409 antes do diagnóstico concluído; 404 para OS inexistente', async () => {
      const { serviceOrderId } = await openAssigned();

      const early = await call(`/service-orders/${serviceOrderId}/approve`, {
        method: 'POST',
      });
      expect(early.status).toBe(409);

      const missing = await call(`/service-orders/${UNKNOWN_ID}/reject`, {
        method: 'POST',
      });
      expect(missing.status).toBe(404);
    });
  });

  describe('regras e validação', () => {
    it('409: veículo já está na oficina', async () => {
      await call('/orders', { body: openBody });
      const response = await call('/orders', { body: openBody });
      expect(response.status).toBe(409);
    });

    it('422: veículo de outro cliente', async () => {
      ctx.vehicles.items.length = 0;
      ctx.vehicles.items.push(makeVehicle(UNKNOWN_ID, VEHICLE_ID));
      const response = await call('/orders', { body: openBody });
      expect(response.status).toBe(422);
    });

    it('400: documento inválido, id malformado ou quantidade zero', async () => {
      const responses = await Promise.all([
        call('/orders', { body: { ...openBody, document: '123' } }),
        call('/service-orders/nao-e-uuid'),
        call(`/service-orders/${UNKNOWN_ID}/services`, {
          body: { serviceId: SERVICE_ID, quantity: 0 },
        }),
      ]);
      for (const response of responses) expect(response.status).toBe(400);
    });

    it('404: OS inexistente', async () => {
      const response = await call(`/service-orders/${UNKNOWN_ID}`);
      expect(response.status).toBe(404);
    });

    it('409: concluir sem mecânico; 422: atribuir um ADMIN', async () => {
      const opened = await readEnvelope(
        await call('/orders', { body: openBody }),
      );
      const id: string = opened.data.serviceOrder.id;

      const withoutMechanic = await call(
        `/service-orders/${id}/complete-diagnosis`,
        { method: 'POST' },
      );
      expect(withoutMechanic.status).toBe(409);

      const assignAdmin = await call(`/service-orders/${id}/assignee`, {
        method: 'PATCH',
        body: { mechanicId: ADMIN_ID },
      });
      expect(assignAdmin.status).toBe(422);
    });
  });
});
