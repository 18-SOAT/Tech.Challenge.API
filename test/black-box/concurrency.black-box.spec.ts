import { describe, expect, it } from 'bun:test';
import { createEmployee } from './support/actors.js';
import { type ApiResponse, request } from './support/api.js';
import { PASSWORD, PHONE, uniqueCpf, uniquePlate } from './support/data.js';
import {
  assign,
  createCustomer,
  createProduct,
  createVehicle,
  finishOrder,
  openOrder,
  orderInExecution,
  quoteWithProduct,
} from './support/fixtures.js';
import { blackBoxSuite } from './support/suite.js';

// Cenários de docs/testing/black-box.md, seção 3. As duas requisições saem ao
// mesmo tempo (Promise.all); a ordem de chegada no banco não é controlada, então
// o teste confere o par de status (uma vence, a outra recebe 409) e o estado
// final pela API — nunca qual das duas venceu.
const statuses = (responses: ApiResponse[]) =>
  responses.map(({ status }) => status).sort((a, b) => a - b);

describe('concorrência (docs/testing/black-box.md)', () => {
  const suite = blackBoxSuite();
  const call = (
    method: string,
    path: string,
    body?: unknown,
    token = suite.admin.token,
  ) => request(suite.api, method, path, { token, body });
  const newCustomer = async () => {
    const { id, document } = await createCustomer(suite.api, suite.admin.token);
    return { customerId: id, document };
  };
  const stockOf = async (productId: string) =>
    (await call('GET', `/products/${productId}`)).body.data.stockQuantity;
  const outMovements = async (productId: string) =>
    (
      await call('QUERY', `/products/${productId}/stock-movements`, {})
    ).body.data.items.filter(({ type }: { type: string }) => type === 'OUT');
  const approve = (serviceOrderId: string) =>
    call('POST', `/service-orders/${serviceOrderId}/approve`);
  const serviceOrderStatus = async (serviceOrderId: string) =>
    (await call('GET', `/service-orders/${serviceOrderId}`)).body.data.status;
  const quote = async (stock: number, quantity: number) =>
    quoteWithProduct(
      suite.api,
      suite.admin.token,
      await newCustomer(),
      suite.mechanic.employeeId,
      { stock, quantity },
    );

  it('CON-01: duas Ordens para o mesmo veículo', async () => {
    const customer = await newCustomer();
    const vehicle = await createVehicle(
      suite.api,
      suite.admin.token,
      customer.customerId,
    );
    const open = () =>
      call('POST', '/orders', {
        document: customer.document,
        plate: vehicle.plate,
      });

    expect(statuses(await Promise.all([open(), open()]))).toEqual([201, 409]);
    expect((await call('QUERY', '/orders', {})).body.data.total).toBe(1);
  });

  it('CON-02: dois rebaixamentos de ADMIN', async () => {
    const other = await createEmployee(suite.api, suite.admin.token, 'ADMIN');
    const demote = (token: string, employeeId: string) =>
      call(
        'PATCH',
        `/employees/${employeeId}/role`,
        { role: 'MECHANIC' },
        token,
      );

    const responses = await Promise.all([
      demote(suite.admin.token, other.employeeId),
      demote(other.token, suite.admin.employeeId),
    ]);

    expect(statuses(responses)).toEqual([200, 409]);
    const admins = await call('QUERY', '/employees', { role: 'ADMIN' });
    expect(admins.body.data.total).toBe(1);
  });

  it('CON-03: duas aprovações da mesma OS', async () => {
    const { serviceOrderId, productId } = await quote(5, 2);

    const responses = await Promise.all([
      approve(serviceOrderId),
      approve(serviceOrderId),
    ]);

    expect(statuses(responses)).toEqual([200, 409]);
    expect(await stockOf(productId)).toBe(3);
    expect(await outMovements(productId)).toHaveLength(1);
  });

  it('CON-04: aprovar e rejeitar ao mesmo tempo', async () => {
    const { serviceOrderId, productId } = await quote(5, 2);

    const [approved, rejected] = await Promise.all([
      approve(serviceOrderId),
      call('POST', `/service-orders/${serviceOrderId}/reject`),
    ]);

    expect(statuses([approved, rejected])).toEqual([200, 409]);
    const approvalWon = approved.status === 200;
    expect(await serviceOrderStatus(serviceOrderId)).toBe(
      approvalWon ? 'IN_EXECUTION' : 'REJECTED',
    );
    expect(await stockOf(productId)).toBe(approvalWon ? 3 : 5);
  });

  it('CON-05: duas baixas do mesmo produto', async () => {
    const { id } = await createProduct(suite.api, suite.admin.token, {
      stock: 5,
    });
    const takeThree = () =>
      call('POST', `/products/${id}/stock/adjustments`, {
        quantity: -3,
        reason: 'Inventário',
      });

    expect(statuses(await Promise.all([takeThree(), takeThree()]))).toEqual([
      201, 409,
    ]);
    expect(await stockOf(id)).toBe(2);
  });

  it('CON-06: duas aprovações disputando o estoque', async () => {
    const { id: productId } = await createProduct(
      suite.api,
      suite.admin.token,
      { stock: 3 },
    );
    // Duas OS diferentes, cada uma pedindo 2 unidades do mesmo produto.
    const contested: string[] = [];
    for (let i = 0; i < 2; i++) {
      const { serviceOrderId } = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );
      await assign(
        suite.api,
        suite.admin.token,
        serviceOrderId,
        suite.mechanic.employeeId,
      );
      await call('POST', `/service-orders/${serviceOrderId}/products`, {
        productId,
        quantity: 2,
      });
      await call(
        'POST',
        `/service-orders/${serviceOrderId}/complete-diagnosis`,
      );
      contested.push(serviceOrderId);
    }

    const responses = await Promise.all(contested.map((id) => approve(id)));

    expect(statuses(responses)).toEqual([200, 409]);
    // A perdedora fez rollback: continua aguardando aprovação.
    const loser =
      contested[responses.findIndex(({ status }) => status === 409)];
    expect(await serviceOrderStatus(loser as string)).toBe('AWAITING_APPROVAL');
    expect(await stockOf(productId)).toBe(1);
  });

  it('CON-07: entrega e reparo adicional', async () => {
    const { orderId, serviceOrderId } = await orderInExecution(
      suite.api,
      suite.admin.token,
      await newCustomer(),
      suite.mechanic.employeeId,
    );
    await finishOrder(suite.api, suite.mechanic.token, serviceOrderId);

    const [delivered, additional] = await Promise.all([
      call('POST', `/orders/${orderId}/deliver`),
      call('POST', `/orders/${orderId}/service-orders`, {}),
    ]);

    expect([delivered.status, additional.status]).toBeOneOf([
      [200, 409],
      [409, 201],
    ]);
    // Nunca uma Ordem entregue com OS aberta.
    const order = (await call('GET', `/orders/${orderId}`)).body.data;
    if (order.status === 'DELIVERED') {
      for (const { status } of order.serviceOrders) {
        expect(['FINISHED', 'REJECTED']).toContain(status);
      }
    }
  });

  it('CON-08: dois cadastros com aliases', async () => {
    const register = (email: string) =>
      request(suite.api, 'POST', '/auth/register', {
        body: {
          email,
          password: PASSWORD,
          document: uniqueCpf(),
          phone: PHONE,
        },
      });

    const responses = await Promise.all([
      register('joao.silva@gmail.com'),
      register('joaosilva+1@gmail.com'),
    ]);

    expect(statuses(responses)).toEqual([201, 409]);
  });

  // Bug #55: o P2002 do driver adapter não traz os campos, então a corrida que
  // chega ao @unique sobe como 500 — de forma intermitente, por isso `todo` e não
  // `failing`. Quando a #55 for corrigida, troque por `it`.
  it.todo('CON-09: placa duplicada em paralelo (#55)', async () => {
    const { customerId } = await newCustomer();
    const plate = uniquePlate();
    const post = () =>
      call('POST', '/vehicles', {
        customerId,
        plate,
        brand: 'Fiat',
        model: 'Uno',
        year: 2015,
      });

    expect(statuses(await Promise.all([post(), post()]))).toEqual([201, 409]);
  });
});
