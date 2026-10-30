import { describe, expect, it } from 'bun:test';
import {
  type Customer,
  createEmployee,
  registerCustomer,
} from './support/actors.js';
import { request } from './support/api.js';
import { expectError } from './support/assertions.js';
import { uniqueCpf, uniquePlate } from './support/data.js';
import {
  assign,
  createCustomer,
  createProduct,
  createService,
  createVehicle,
  deliverOrder,
  finishOrder,
  openOrder,
  orderAwaitingApproval,
  orderInExecution,
  orderReadyToDeliver,
  quoteWithProduct,
} from './support/fixtures.js';
import { waitForEmail } from './support/mailpit.js';
import { blackBoxSuite } from './support/suite.js';

// Cenários de docs/testing/black-box.md, seção 2 › service-order.
const NOT_IN_DIAGNOSIS =
  'Os itens só podem mudar enquanto a OS está em diagnóstico.';
const ALREADY_DELIVERED =
  'A ordem já foi entregue: abra uma nova ordem para o veículo.';
const INSUFFICIENT_STOCK =
  'Estoque insuficiente: o saldo do produto não pode ficar negativo.';

// Mesmo formato do e-mail do orçamento (ServiceOrderEmailMailer).
const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format;

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};
const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe('service-order (docs/testing/black-box.md)', () => {
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
  const serviceOrder = async (id: string) =>
    (await call('GET', `/service-orders/${id}`)).body.data;
  const order = async (id: string) =>
    (await call('GET', `/orders/${id}`)).body.data;
  const stockOf = async (productId: string) =>
    (await call('GET', `/products/${productId}`)).body.data.stockQuantity;
  const movementsOf = async (productId: string) =>
    (await call('QUERY', `/products/${productId}/stock-movements`, {})).body
      .data.items as { type: string; quantity: number }[];
  const approve = (serviceOrderId: string, token = suite.admin.token) =>
    call('POST', `/service-orders/${serviceOrderId}/approve`, undefined, token);
  const reject = (serviceOrderId: string) =>
    call('POST', `/service-orders/${serviceOrderId}/reject`);
  const deliver = (orderId: string) =>
    call('POST', `/orders/${orderId}/deliver`);
  const mechanicId = () => suite.mechanic.employeeId;

  it('SO-01: fluxo feliz de ponta a ponta', async () => {
    // 1. Preparação.
    const customer = await registerCustomer(suite.api);
    const vehicle = await createVehicle(
      suite.api,
      suite.admin.token,
      customer.customerId,
    );
    const service = (
      await call('POST', '/services', {
        name: 'Troca de óleo',
        price: 100,
        estimatedDurationMinutes: 30,
      })
    ).body.data;
    const product = await createProduct(suite.api, suite.admin.token, {
      stock: 10,
    });
    const myOrder = async (orderId: string) =>
      request(suite.api, 'GET', `/me/orders/${orderId}`, {
        token: customer.token,
      });

    // 2. Abertura da Ordem.
    const opened = await call('POST', '/orders', {
      document: customer.document,
      plate: vehicle.plate,
      services: [{ serviceId: service.id, quantity: 1 }],
    });
    expect(opened.status).toBe(201);
    expect(opened.body.data.order.status).toBe('RECEIVED');
    expect(opened.body.data.serviceOrder.status).toBe('IN_DIAGNOSIS');
    const orderId = opened.body.data.order.id;
    const orderNumber = opened.body.data.order.number;
    const serviceOrderId = opened.body.data.serviceOrder.id;

    // 3. O cliente vê "Recebida": a OS ainda não tem responsável.
    const received = await myOrder(orderId);
    expect(received.status).toBe(200);
    expect(received.body.data.status).toBe('RECEIVED');

    // 4. Atribuição.
    await assign(suite.api, suite.admin.token, serviceOrderId, mechanicId());
    expect((await myOrder(orderId)).body.data.status).toBe('IN_DIAGNOSIS');

    // 5. O mecânico inclui o produto: total com o preço do catálogo.
    const added = await call(
      'POST',
      `/service-orders/${serviceOrderId}/products`,
      { productId: product.id, quantity: 2 },
      suite.mechanic.token,
    );
    expect(added.status).toBe(201);
    expect(added.body.data.total).toBe(100 + 2 * 50);

    // 6. Diagnóstico concluído: orçamento por e-mail.
    const diagnosed = await call(
      'POST',
      `/service-orders/${serviceOrderId}/complete-diagnosis`,
      undefined,
      suite.mechanic.token,
    );
    expect(diagnosed.status).toBe(200);
    expect(diagnosed.body.data.status).toBe('AWAITING_APPROVAL');

    const quote = await waitForEmail(customer.email, {
      subject: `Orçamento da ordem nº ${orderNumber}`,
    });
    expect(quote.to).toEqual([customer.email]);
    expect(quote.text).toContain(
      `- Troca de óleo: 1 × ${brl(100)} = ${brl(100)}`,
    );
    expect(quote.text).toContain(`: 2 × ${brl(50)} = ${brl(100)}`);
    expect(
      quote.text.split('\n').filter((line) => line.startsWith('- ')),
    ).toHaveLength(2);
    expect(quote.text).toContain(`Total: ${brl(200)}`);

    // 7. O cliente aprova: estoque baixado com movimentação de saída.
    const approved = await approve(serviceOrderId, customer.token);
    expect(approved.status).toBe(200);
    expect(approved.body.data).toMatchObject({
      status: 'IN_EXECUTION',
      approvedAmount: 200,
    });
    expect((await order(orderId)).status).toBe('IN_PROGRESS');
    expect(await stockOf(product.id)).toBe(8);
    expect(await movementsOf(product.id)).toContainEqual(
      expect.objectContaining({ type: 'OUT', quantity: 2, serviceOrderId }),
    );

    // 8. O mecânico finaliza.
    const finished = await call(
      'POST',
      `/service-orders/${serviceOrderId}/finish`,
      undefined,
      suite.mechanic.token,
    );
    expect(finished.status).toBe(200);
    expect(finished.body.data.status).toBe('FINISHED');

    // 9. Entrega.
    const delivered = await deliver(orderId);
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.status).toBe('DELIVERED');
    expect(delivered.body.data.deliveredAt).toBeString();
    expect((await myOrder(orderId)).body.data.status).toBe('DELIVERED');

    // 10. A OS entra no tempo médio de execução.
    const report = await call('QUERY', '/service-orders/execution-time', {
      finishedFrom: startOfToday(),
      finishedTo: inOneHour(),
    });
    expect(report.status).toBe(200);
    expect(report.body.data.global.count).toBe(1);
    expect(report.body.data.byService).toEqual([
      expect.objectContaining({
        serviceId: service.id,
        name: 'Troca de óleo',
        estimatedDurationMinutes: 30,
        count: 1,
      }),
    ]);
  });

  describe('regras', () => {
    it('SO-02: cliente ou veículo inexistente', async () => {
      const customer = await newCustomer();
      const vehicle = await createVehicle(
        suite.api,
        suite.admin.token,
        customer.customerId,
      );

      expectError(
        await call('POST', '/orders', {
          document: uniqueCpf(),
          plate: vehicle.plate,
        }),
        404,
        'Cliente não encontrado.',
      );
      expectError(
        await call('POST', '/orders', {
          document: customer.document,
          plate: uniquePlate(),
        }),
        404,
        'Veículo não encontrado.',
      );
    });

    it('SO-03: veículo de outro cliente', async () => {
      const owner = await newCustomer();
      const other = await newCustomer();
      const vehicle = await createVehicle(
        suite.api,
        suite.admin.token,
        owner.customerId,
      );

      expectError(
        await call('POST', '/orders', {
          document: other.document,
          plate: vehicle.plate,
        }),
        422,
        'O veículo informado não pertence a esse cliente.',
      );
    });

    it('SO-04: veículo com Ordem aberta', async () => {
      const customer = await newCustomer();
      const first = await orderReadyToDeliver(
        suite.api,
        suite.admin.token,
        customer,
        mechanicId(),
      );
      const reopen = () =>
        call('POST', '/orders', {
          document: customer.document,
          plate: first.plate,
        });

      expectError(
        await reopen(),
        409,
        'O veículo já está na oficina com uma ordem aberta. Para um novo trabalho, abra um reparo adicional nela.',
      );

      await deliverOrder(suite.api, suite.admin.token, first.orderId);
      expect((await reopen()).status).toBe(201);
    });

    it('SO-05: responsável que não é mecânico', async () => {
      const { serviceOrderId } = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );

      expectError(
        await call('PATCH', `/service-orders/${serviceOrderId}/assignee`, {
          mechanicId: suite.admin.employeeId,
        }),
        422,
        'Só um funcionário com papel MECHANIC pode ser o responsável pela OS.',
      );
    });

    it('SO-06: diagnóstico sem responsável', async () => {
      const { serviceOrderId } = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );

      expectError(
        await call(
          'POST',
          `/service-orders/${serviceOrderId}/complete-diagnosis`,
        ),
        409,
        'Atribua um mecânico antes de concluir o diagnóstico.',
      );
    });

    it('SO-07: diagnóstico sem itens', async () => {
      const customer = await newCustomer();
      const vehicle = await createVehicle(
        suite.api,
        suite.admin.token,
        customer.customerId,
      );
      const opened = await call('POST', '/orders', {
        document: customer.document,
        plate: vehicle.plate,
      });
      const serviceOrderId = opened.body.data.serviceOrder.id;
      await assign(suite.api, suite.admin.token, serviceOrderId, mechanicId());

      expectError(
        await call(
          'POST',
          `/service-orders/${serviceOrderId}/complete-diagnosis`,
        ),
        409,
        'Inclua ao menos um serviço ou produto antes de concluir o diagnóstico.',
      );
    });

    it('SO-08: itens só em diagnóstico', async () => {
      const { serviceOrderId, serviceItemId } = await orderAwaitingApproval(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      const product = await createProduct(suite.api, suite.admin.token);
      const item = `/service-orders/${serviceOrderId}/items/${serviceItemId}`;

      for (const response of [
        await call('POST', `/service-orders/${serviceOrderId}/products`, {
          productId: product.id,
          quantity: 1,
        }),
        await call('PATCH', item, { quantity: 2 }),
        await call('DELETE', item),
      ]) {
        expectError(response, 409, NOT_IN_DIAGNOSIS);
      }
    });

    it('SO-09: itens', async () => {
      const { serviceOrderId } = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );
      await assign(suite.api, suite.admin.token, serviceOrderId, mechanicId());
      const product = await createProduct(suite.api, suite.admin.token);
      const addProduct = (quantity: number) =>
        call(
          'POST',
          `/service-orders/${serviceOrderId}/products`,
          { productId: product.id, quantity },
          suite.mechanic.token,
        );

      await addProduct(2);
      // Preço novo no catálogo não muda o item já orçado.
      await call('PATCH', `/products/${product.id}`, { price: 80 });
      const summed = await addProduct(3);
      expect(summed.status).toBe(201);
      expect(summed.body.data.products).toEqual([
        expect.objectContaining({ quantity: 5, unitPrice: 50 }),
      ]);
      expect(summed.body.data.total).toBe(100 + 5 * 50);

      const itemPath = `/service-orders/${serviceOrderId}/items/${summed.body.data.products[0].id}`;
      const changed = await call(
        'PATCH',
        itemPath,
        { quantity: 1 },
        suite.mechanic.token,
      );
      expect(changed.status).toBe(200);
      expect(changed.body.data.total).toBe(150);

      const removed = await call(
        'DELETE',
        itemPath,
        undefined,
        suite.mechanic.token,
      );
      expect(removed.status).toBe(200);
      expect(removed.body.data).toMatchObject({ products: [], total: 100 });

      expectError(await addProduct(0), 400);
    });

    it('SO-10: transições inválidas', async () => {
      const inDiagnosis = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );
      expectError(
        await approve(inDiagnosis.serviceOrderId),
        409,
        'O orçamento desta OS não está aguardando aprovação.',
      );

      const awaiting = await orderAwaitingApproval(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      expectError(
        await call('POST', `/service-orders/${awaiting.serviceOrderId}/finish`),
        409,
        'Só uma OS em execução pode ser finalizada.',
      );

      const finished = await orderInExecution(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      await finishOrder(
        suite.api,
        suite.mechanic.token,
        finished.serviceOrderId,
      );
      expectError(
        await call(
          'PATCH',
          `/service-orders/${finished.serviceOrderId}/assignee`,
          { mechanicId: mechanicId() },
        ),
        409,
        'A OS já foi finalizada ou rejeitada.',
      );
    });

    it('SO-11: rejeição', async () => {
      const quote = await quoteWithProduct(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
        { stock: 5, quantity: 2 },
      );

      const rejected = await reject(quote.serviceOrderId);
      expect(rejected.status).toBe(200);
      expect(rejected.body.data.status).toBe('REJECTED');
      expect(await stockOf(quote.productId)).toBe(5);
      expect((await order(quote.orderId)).status).toBe('RECEIVED');

      const delivered = await deliver(quote.orderId);
      expect(delivered.status).toBe(200);
      expect(delivered.body.data.status).toBe('DELIVERED');
    });

    it('SO-12: saldo insuficiente na aprovação', async () => {
      const quote = await quoteWithProduct(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
        { stock: 3, quantity: 5 },
      );

      expectError(await approve(quote.serviceOrderId), 409, INSUFFICIENT_STOCK);

      // Rollback: nada da aprovação ficou gravado.
      expect(await serviceOrder(quote.serviceOrderId)).toMatchObject({
        status: 'AWAITING_APPROVAL',
        approvedAmount: null,
      });
      expect(await stockOf(quote.productId)).toBe(3);
      expect(
        (await movementsOf(quote.productId)).map(({ type }) => type),
      ).toEqual(['IN']);
      expect((await order(quote.orderId)).status).toBe('RECEIVED');
    });

    it('SO-13: aprovação depois de repor estoque', async () => {
      const quote = await quoteWithProduct(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
        { stock: 3, quantity: 5 },
      );
      expectError(await approve(quote.serviceOrderId), 409, INSUFFICIENT_STOCK);

      await call('POST', `/products/${quote.productId}/stock/entries`, {
        quantity: 10,
      });

      expect((await approve(quote.serviceOrderId)).status).toBe(200);
      expect(await stockOf(quote.productId)).toBe(8);
    });

    it('SO-14: entrega com OS aberta', async () => {
      const { orderId } = await orderInExecution(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );

      expectError(
        await deliver(orderId),
        409,
        'O veículo só é entregue com todas as OS finalizadas ou rejeitadas.',
      );
    });

    it('SO-15: entrega repetida', async () => {
      const { orderId } = await orderReadyToDeliver(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );

      expect((await deliver(orderId)).status).toBe(200);
      expectError(await deliver(orderId), 409, ALREADY_DELIVERED);
    });

    it('SO-16: reparo adicional', async () => {
      const inProgress = await orderInExecution(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      const additional = await call(
        'POST',
        `/orders/${inProgress.orderId}/service-orders`,
        { description: 'Barulho na suspensão' },
      );
      expect(additional.status).toBe(201);
      expect(additional.body.data).toMatchObject({
        orderId: inProgress.orderId,
        status: 'IN_DIAGNOSIS',
      });

      const delivered = await orderReadyToDeliver(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      await deliverOrder(suite.api, suite.admin.token, delivered.orderId);
      expectError(
        await call('POST', `/orders/${delivered.orderId}/service-orders`, {}),
        409,
        ALREADY_DELIVERED,
      );
    });

    it('SO-17: aprovação pelo ADMIN', async () => {
      const { serviceOrderId } = await orderAwaitingApproval(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );

      const approved = await approve(serviceOrderId);

      expect(approved.status).toBe(200);
      expect(approved.body.data.status).toBe('IN_EXECUTION');
    });
  });

  describe('consultas', () => {
    const ids = (response: { body: { data: { items: { id: string }[] } } }) =>
      response.body.data.items.map(({ id }) => id);

    it('SO-Q01: fila por prioridade', async () => {
      const inDiagnosis = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );
      await assign(
        suite.api,
        suite.admin.token,
        inDiagnosis.serviceOrderId,
        mechanicId(),
      );
      const awaiting = await orderAwaitingApproval(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      const inExecution = await orderInExecution(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      const finished = await orderInExecution(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      await finishOrder(
        suite.api,
        suite.mechanic.token,
        finished.serviceOrderId,
      );

      const queue = await call('QUERY', '/service-orders/queue', {});

      expect(queue.status).toBe(200);
      expect(ids(queue)).toEqual([
        inExecution.serviceOrderId,
        awaiting.serviceOrderId,
        inDiagnosis.serviceOrderId,
      ]);
    });

    it('SO-Q02: escopo do mecânico', async () => {
      const other = await createEmployee(
        suite.api,
        suite.admin.token,
        'MECHANIC',
      );
      const mine = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );
      await assign(
        suite.api,
        suite.admin.token,
        mine.serviceOrderId,
        mechanicId(),
      );
      const theirs = await openOrder(
        suite.api,
        suite.admin.token,
        await newCustomer(),
      );
      await assign(
        suite.api,
        suite.admin.token,
        theirs.serviceOrderId,
        other.employeeId,
      );

      for (const body of [{}, { assigneeId: other.employeeId }]) {
        const listed = await call(
          'QUERY',
          '/service-orders',
          body,
          suite.mechanic.token,
        );
        expect(ids(listed)).toEqual([mine.serviceOrderId]);
      }
    });

    const executionTime = (finishedFrom: string) =>
      call('QUERY', '/service-orders/execution-time', { finishedFrom });

    it('SO-Q03: filtros de data — texto que não é data', async () => {
      expectError(await executionTime('ontem'), 400);
    });

    // Bug #54: o `date-time` do Elysia aceita data curta e o `new Date` a lê como
    // mês/dia (01/10 vira 10 de janeiro). Quando a #54 for corrigida, este caso
    // passa a responder 400 e o `failing` acusa: troque por `it`.
    it.failing('SO-Q03: filtros de data — fora de ISO 8601 (#54)', async () => {
      for (const date of ['01/10/2026', '2026-10-01']) {
        expectError(await executionTime(date), 400);
      }
    });

    it('SO-Q04: totais da Ordem', async () => {
      const approved = await orderInExecution(
        suite.api,
        suite.admin.token,
        await newCustomer(),
        mechanicId(),
      );
      const additional = (
        await call('POST', `/orders/${approved.orderId}/service-orders`, {})
      ).body.data.id;
      const service = await createService(suite.api, suite.admin.token);
      await assign(suite.api, suite.admin.token, additional, mechanicId());
      await call('POST', `/service-orders/${additional}/services`, {
        serviceId: service.id,
        quantity: 1,
      });
      await call('POST', `/service-orders/${additional}/complete-diagnosis`);
      expect((await reject(additional)).status).toBe(200);

      // Cada OS orça um serviço de R$ 100.
      expect(await order(approved.orderId)).toMatchObject({
        quotedTotal: 200,
        approvedTotal: 100,
      });
    });

    it('SO-Q05: área do cliente', async () => {
      const customer: Customer = await registerCustomer(suite.api);
      const mine = [
        await openOrder(suite.api, suite.admin.token, customer),
        await openOrder(suite.api, suite.admin.token, customer),
      ];
      await openOrder(suite.api, suite.admin.token, await newCustomer());

      const listed = await request(suite.api, 'GET', '/me/orders', {
        token: customer.token,
      });

      expect(listed.status).toBe(200);
      expect(
        listed.body.data.map(({ id }: { id: string }) => id).sort(),
      ).toEqual(mine.map(({ orderId }) => orderId).sort());
    });

    it('SO-Q06: tempo médio por serviço', async () => {
      const finishedWith = async () => {
        const opened = await orderInExecution(
          suite.api,
          suite.admin.token,
          await newCustomer(),
          mechanicId(),
        );
        await finishOrder(
          suite.api,
          suite.mechanic.token,
          opened.serviceOrderId,
        );
        return opened;
      };
      const withX = await finishedWith();
      await finishedWith(); // outra OS, com outro serviço

      const report = await call('QUERY', '/service-orders/execution-time', {
        finishedFrom: startOfToday(),
        finishedTo: inOneHour(),
        serviceId: withX.serviceId,
      });

      expect(report.status).toBe(200);
      expect(report.body.data.global.count).toBe(1);
      expect(report.body.data.byService).toEqual([
        expect.objectContaining({
          serviceId: withX.serviceId,
          estimatedDurationMinutes: 30,
          count: 1,
        }),
      ]);
      // Minutos com 1 casa decimal.
      const { averageMinutes } = report.body.data.global;
      expect(Math.round(averageMinutes * 10)).toBe(averageMinutes * 10);
    });

    it('SO-Q07: tempo médio sem dados', async () => {
      const report = await call('QUERY', '/service-orders/execution-time', {
        finishedFrom: '2000-01-01T00:00:00Z',
        finishedTo: '2000-01-02T00:00:00Z',
      });

      expect(report.status).toBe(200);
      expect(report.body.data).toEqual({
        global: { averageMinutes: 0, count: 0 },
        byService: [],
      });
    });
  });
});
