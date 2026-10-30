import { describe, expect, it } from 'bun:test';
import { request } from './support/api.js';
import { expectError } from './support/assertions.js';
import { uniqueName, uniqueSku } from './support/data.js';
import {
  assign,
  createCustomer,
  createProduct,
  createService,
  openOrder,
} from './support/fixtures.js';
import { blackBoxSuite } from './support/suite.js';

// Cenários de docs/testing/black-box.md, seção 2 › inventory.
const INACTIVE_ITEM = 'Serviço ou produto inativo não entra em orçamento novo.';
const PRODUCT_IN_USE =
  'Produto com movimentação de estoque ou usado em ordens de serviço não pode ser excluído. Desative-o.';

describe('inventory (docs/testing/black-box.md)', () => {
  const suite = blackBoxSuite();
  const call = (method: string, path: string, body?: unknown) =>
    request(suite.api, method, path, { token: suite.admin.token, body });
  const postService = (body: object = {}) =>
    call('POST', '/services', {
      name: uniqueName('Serviço'),
      price: 89.9,
      estimatedDurationMinutes: 30,
      ...body,
    });
  const postProduct = (body: object = {}) =>
    call('POST', '/products', {
      sku: uniqueSku(),
      name: uniqueName('Peça'),
      type: 'PART',
      price: 50,
      ...body,
    });
  const stockOf = async (productId: string) =>
    (await call('GET', `/products/${productId}`)).body.data.stockQuantity;
  const entry = (productId: string, quantity: number) =>
    call('POST', `/products/${productId}/stock/entries`, { quantity });
  const adjust = (productId: string, body: object) =>
    call('POST', `/products/${productId}/stock/adjustments`, body);
  const newCustomer = async () => {
    const { id, document } = await createCustomer(suite.api, suite.admin.token);
    return { customerId: id, document };
  };

  it('INV-01: CRUD de serviço', async () => {
    const created = await postService();
    expect(created.status).toBe(201);
    const { id, name } = created.body.data;

    expect((await call('GET', `/services/${id}`)).status).toBe(200);

    const updated = await call('PATCH', `/services/${id}`, { price: 99.9 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.price).toBe(99.9);

    const listed = await call('QUERY', '/services', { name });
    expect(listed.status).toBe(200);
    expect(listed.body.data.items.map(({ id }: { id: string }) => id)).toEqual([
      id,
    ]);

    expect((await call('DELETE', `/services/${id}`)).status).toBe(200);
  });

  it('INV-02: nome de serviço duplicado (sem diferenciar maiúsculas)', async () => {
    await postService({ name: 'Troca de óleo' });

    expectError(
      await postService({ name: 'troca de óleo' }),
      409,
      'Já existe um serviço com esse nome no catálogo.',
    );
  });

  it('INV-03: validação de serviço', async () => {
    for (const body of [
      { price: -1 },
      { price: 10.555 },
      { estimatedDurationMinutes: 0 },
    ]) {
      expectError(await postService(body), 400);
    }
  });

  it('INV-04: serviço desativado', async () => {
    const customer = await newCustomer();
    const order = await openOrder(suite.api, suite.admin.token, customer);
    const service = await createService(suite.api, suite.admin.token);
    await call('PATCH', `/services/${service.id}`, { active: false });

    // Ordem nova com o serviço desativado (com outro veículo do mesmo cliente).
    const vehicle = await call('POST', '/vehicles', {
      customerId: customer.customerId,
      plate: 'INA1V23',
      brand: 'Fiat',
      model: 'Uno',
      year: 2015,
    });
    expectError(
      await call('POST', '/orders', {
        document: customer.document,
        plate: vehicle.body.data.plate,
        services: [{ serviceId: service.id, quantity: 1 }],
      }),
      409,
      INACTIVE_ITEM,
    );

    // Inclusão numa OS em diagnóstico.
    await assign(
      suite.api,
      suite.admin.token,
      order.serviceOrderId,
      suite.mechanic.employeeId,
    );
    expectError(
      await call('POST', `/service-orders/${order.serviceOrderId}/services`, {
        serviceId: service.id,
        quantity: 1,
      }),
      409,
      INACTIVE_ITEM,
    );
  });

  it('INV-05: serviço em uso', async () => {
    const { serviceId } = await openOrder(
      suite.api,
      suite.admin.token,
      await newCustomer(),
    );

    expectError(
      await call('DELETE', `/services/${serviceId}`),
      409,
      'Serviço já usado em ordens de serviço não pode ser excluído. Desative-o.',
    );
  });

  it('INV-06: cadastro de produto', async () => {
    const created = await postProduct({ sku: 'filtro-01' });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      sku: 'FILTRO-01',
      stockQuantity: 0,
    });
  });

  it('INV-07: SKU', async () => {
    await postProduct({ sku: 'filtro-02' });

    expectError(
      await postProduct({ sku: 'FILTRO-02' }),
      409,
      'Já existe um produto com esse SKU.',
    );
    expectError(await postProduct({ sku: 'filtro#03' }), 400);
  });

  it('INV-08: entrada de estoque', async () => {
    const { id } = await createProduct(suite.api, suite.admin.token);

    expect((await entry(id, 10)).status).toBe(201);
    expect(await stockOf(id)).toBe(10);
  });

  it('INV-09: ajuste', async () => {
    const { id } = await createProduct(suite.api, suite.admin.token, {
      stock: 10,
    });

    const adjusted = await adjust(id, { quantity: -3, reason: 'Avaria' });
    expect(adjusted.status).toBe(201);
    expect(await stockOf(id)).toBe(7);

    expectError(await adjust(id, { quantity: -1 }), 400);
    expectError(await adjust(id, { quantity: 0, reason: 'Nada' }), 400);
    expect(await stockOf(id)).toBe(7);
  });

  it('INV-10: ajuste deixaria saldo negativo', async () => {
    const { id } = await createProduct(suite.api, suite.admin.token, {
      stock: 7,
    });

    expectError(
      await adjust(id, { quantity: -8, reason: 'Inventário' }),
      409,
      'Estoque insuficiente: o saldo do produto não pode ficar negativo.',
    );
    expect(await stockOf(id)).toBe(7);
  });

  it('INV-11: histórico de movimentações', async () => {
    const { id } = await createProduct(suite.api, suite.admin.token, {
      stock: 10,
    });
    await adjust(id, { quantity: -3, reason: 'Avaria' });

    const movements = await call(
      'QUERY',
      `/products/${id}/stock-movements`,
      {},
    );

    expect(movements.status).toBe(200);
    expect(movements.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'IN', quantity: 10 }),
        expect.objectContaining({
          type: 'ADJUSTMENT',
          quantity: -3,
          reason: 'Avaria',
        }),
      ]),
    );
    expect(movements.body.data.total).toBe(2);

    expectError(
      await call(
        'QUERY',
        `/products/${crypto.randomUUID()}/stock-movements`,
        {},
      ),
      404,
      'Produto não encontrado.',
    );
  });

  it('INV-12: abaixo do mínimo', async () => {
    const ids: string[] = [];
    for (const stock of [4, 5, 6]) {
      const { id } = (await postProduct({ minimumStock: 5 })).body.data;
      await entry(id, stock);
      ids.push(id);
    }

    const below = await call('QUERY', '/products', { belowMinimum: true });

    expect(below.body.data.items.map(({ id }: { id: string }) => id)).toEqual([
      ids[0],
    ]);
  });

  it('INV-13: estoque só muda por movimentação', async () => {
    const created = await postProduct({ stockQuantity: 10 });
    expect(created.status).toBe(201);
    const { id } = created.body.data;
    expect(created.body.data.stockQuantity).toBe(0);

    expectError(
      await call('PATCH', `/products/${id}`, { stockQuantity: 10 }),
      400,
    );

    const name = uniqueName('Peça renomeada');
    const updated = await call('PATCH', `/products/${id}`, {
      stockQuantity: 10,
      name,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name, stockQuantity: 0 });
  });

  it('INV-14: produto em uso', async () => {
    const withMovement = await createProduct(suite.api, suite.admin.token, {
      stock: 1,
    });
    expectError(
      await call('DELETE', `/products/${withMovement.id}`),
      409,
      PRODUCT_IN_USE,
    );

    // Sem movimentação, mas incluído numa OS (o saldo só baixa na aprovação).
    const inOrder = await createProduct(suite.api, suite.admin.token);
    const order = await openOrder(
      suite.api,
      suite.admin.token,
      await newCustomer(),
    );
    await assign(
      suite.api,
      suite.admin.token,
      order.serviceOrderId,
      suite.mechanic.employeeId,
    );
    const added = await call(
      'POST',
      `/service-orders/${order.serviceOrderId}/products`,
      { productId: inOrder.id, quantity: 1 },
    );
    expect(added.status).toBe(201);
    expectError(
      await call('DELETE', `/products/${inOrder.id}`),
      409,
      PRODUCT_IN_USE,
    );
  });
});
