import { beforeEach, describe, expect, it } from 'bun:test';
import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { makeTestApp } from './fakes/make-test-app.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

const UNKNOWN_ID = '01920000-0000-7000-8000-000000000000';

describe('Products (e2e)', () => {
  let ctx: ReturnType<typeof makeTestApp>;
  let adminToken: string;

  const employeeToken = (role: EmployeeRole) =>
    ctx.tokens.sign({
      sub: 'user-admin',
      email: 'admin@oficina.com',
      type: UserType.EMPLOYEE,
      employeeId: 'employee-1',
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

  const validProduct = () => ({
    sku: 'pf-123',
    name: 'Pastilha de freio dianteira',
    description: 'Jogo com 4 unidades',
    type: 'PART',
    price: 149.9,
    minimumStock: 4,
  });

  const create = async (overrides: object = {}) =>
    (
      await readEnvelope(
        await call('/products', { body: { ...validProduct(), ...overrides } }),
      )
    ).data;

  const receive = (id: string, quantity: number) =>
    call(`/products/${id}/stock/entries`, { body: { quantity } });

  const adjust = (id: string, quantity: number, reason = 'Inventário') =>
    call(`/products/${id}/stock/adjustments`, { body: { quantity, reason } });

  beforeEach(async () => {
    ctx = makeTestApp();
    adminToken = await employeeToken(EmployeeRole.ADMIN);
  });

  describe('acesso', () => {
    const readRoutes = [
      { method: 'QUERY', path: '/products', body: { page: 1, limit: 10 } },
      { method: 'GET', path: `/products/${UNKNOWN_ID}` },
      {
        method: 'QUERY',
        path: `/products/${UNKNOWN_ID}/stock-movements`,
        body: {},
      },
    ];
    const writeRoutes = [
      {
        method: 'POST',
        path: '/products',
        body: { sku: 'X', name: 'X', type: 'PART', price: 1 },
      },
      { method: 'PATCH', path: `/products/${UNKNOWN_ID}`, body: { price: 1 } },
      { method: 'DELETE', path: `/products/${UNKNOWN_ID}` },
      {
        method: 'POST',
        path: `/products/${UNKNOWN_ID}/stock/entries`,
        body: { quantity: 1 },
      },
      {
        method: 'POST',
        path: `/products/${UNKNOWN_ID}/stock/adjustments`,
        body: { quantity: -1, reason: 'X' },
      },
    ];

    it.each([...readRoutes, ...writeRoutes])(
      '401: $method $path sem token',
      async (route) => {
        const response = await call(route.path, { ...route, token: null });

        expect(response.status).toBe(401);
      },
    );

    it.each([...readRoutes, ...writeRoutes])(
      '403: $method $path com token de cliente',
      async (route) => {
        const token = await ctx.tokens.sign({
          sub: 'user-1',
          email: 'joao@oficina.com',
          type: UserType.CUSTOMER,
          customerId: 'customer-1',
        });
        const response = await call(route.path, { ...route, token });

        expect(response.status).toBe(403);
      },
    );

    it.each(writeRoutes)(
      '403: $method $path com MECHANIC (só consulta)',
      async (route) => {
        const token = await employeeToken(EmployeeRole.MECHANIC);
        const response = await call(route.path, { ...route, token });

        expect(response.status).toBe(403);
      },
    );

    it('MECHANIC consulta produtos, saldo e extrato', async () => {
      const { id } = await create();
      const token = await employeeToken(EmployeeRole.MECHANIC);

      const list = await call('/products', {
        method: 'QUERY',
        body: {},
        token,
      });
      const detail = await call(`/products/${id}`, { token });
      const movements = await call(`/products/${id}/stock-movements`, {
        method: 'QUERY',
        body: {},
        token,
      });

      expect(list.status).toBe(200);
      expect(detail.status).toBe(200);
      expect(movements.status).toBe(200);
    });
  });

  describe('POST /products', () => {
    it('201: cadastra ativo, com saldo 0, SKU em maiúsculas e só a whitelist', async () => {
      const response = await call('/products', { body: validProduct() });
      const body = await readEnvelope(response);

      expect(response.status).toBe(201);
      expect(Object.keys(body.data).sort()).toStrictEqual(
        [
          'active',
          'belowMinimum',
          'description',
          'id',
          'minimumStock',
          'name',
          'price',
          'sku',
          'stockQuantity',
          'type',
        ].sort(),
      );
      expect(body.data).toMatchObject({
        sku: 'PF-123',
        type: 'PART',
        price: 149.9,
        stockQuantity: 0,
        minimumStock: 4,
        belowMinimum: true,
        active: true,
      });
    });

    it('409: SKU já cadastrado', async () => {
      await create();

      const response = await call('/products', {
        body: { ...validProduct(), sku: 'PF-123', name: 'Outro' },
      });

      expect(response.status).toBe(409);
    });

    it.each([
      ['SKU com espaço', { sku: 'PF 123' }],
      ['tipo desconhecido', { type: 'TOOL' }],
      ['preço com 3 casas', { price: 10.005 }],
      ['mínimo negativo', { minimumStock: -1 }],
    ])('400: %s', async (_, overrides) => {
      const response = await call('/products', {
        body: { ...validProduct(), ...overrides },
      });

      expect(response.status).toBe(400);
    });

    // O Elysia normaliza o body: campo fora do schema é descartado, não vira 400.
    it('ignora saldo enviado no cadastro: nasce com 0', async () => {
      const product = await create({ stockQuantity: 10 });

      expect(product.stockQuantity).toBe(0);
    });
  });

  describe('QUERY /products', () => {
    beforeEach(async () => {
      const pad = await create();
      await create({
        sku: 'OL-5W30',
        name: 'Óleo 5W30 1L',
        type: 'SUPPLY',
        minimumStock: 2,
      });
      await receive(pad.id, 10);
    });

    it('belowMinimum=true lista só o que precisa repor', async () => {
      const response = await call('/products', {
        method: 'QUERY',
        body: { belowMinimum: true },
      });
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data.total).toBe(1);
      expect(body.data.items[0].sku).toBe('OL-5W30');
    });

    it('filtra por tipo e busca por SKU parcial', async () => {
      const byType = await readEnvelope(
        await call('/products', { method: 'QUERY', body: { type: 'PART' } }),
      );
      const bySku = await readEnvelope(
        await call('/products', { method: 'QUERY', body: { sku: 'ol-' } }),
      );

      expect(byType.data.items.map((p: any) => p.sku)).toStrictEqual([
        'PF-123',
      ]);
      expect(bySku.data.items.map((p: any) => p.sku)).toStrictEqual([
        'OL-5W30',
      ]);
    });
  });

  describe('GET /products/:id', () => {
    it('404: produto inexistente', async () => {
      expect((await call(`/products/${UNKNOWN_ID}`)).status).toBe(404);
    });

    it('400: id malformado', async () => {
      expect((await call('/products/abc')).status).toBe(400);
    });
  });

  describe('PATCH /products/:id', () => {
    it('200: altera catálogo sem mexer no saldo', async () => {
      const { id } = await create();
      await receive(id, 7);

      const response = await call(`/products/${id}`, {
        method: 'PATCH',
        body: { price: 159.9, active: false },
      });
      const body = await readEnvelope(response);

      expect(response.status).toBe(200);
      expect(body.data).toMatchObject({
        price: 159.9,
        active: false,
        stockQuantity: 7,
      });
    });

    it('saldo não é alterável pelo PATCH: o campo é descartado', async () => {
      const { id } = await create();
      await receive(id, 3);

      const onlyStock = await call(`/products/${id}`, {
        method: 'PATCH',
        body: { stockQuantity: 50 },
      });
      const withName = await readEnvelope(
        await call(`/products/${id}`, {
          method: 'PATCH',
          body: { stockQuantity: 50, name: 'Pastilha cerâmica' },
        }),
      );

      // Sobrando nenhum campo, o minProperties do schema responde 400.
      expect(onlyStock.status).toBe(400);
      expect(withName.data.stockQuantity).toBe(3);
    });

    it('409: SKU de outro produto', async () => {
      const { id } = await create();
      await create({ sku: 'PF-999', name: 'Outra' });

      const response = await call(`/products/${id}`, {
        method: 'PATCH',
        body: { sku: 'pf-999' },
      });

      expect(response.status).toBe(409);
    });
  });

  describe('estoque', () => {
    it('entrada e ajuste mudam o saldo e aparecem no extrato', async () => {
      const { id } = await create();

      const entry = await receive(id, 10);
      const adjustment = await adjust(id, -3, 'Avaria');
      const movements = await readEnvelope(
        await call(`/products/${id}/stock-movements`, {
          method: 'QUERY',
          body: {},
        }),
      );

      expect(entry.status).toBe(201);
      expect(adjustment.status).toBe(201);
      expect((await readEnvelope(adjustment)).data).toMatchObject({
        stockQuantity: 7,
        belowMinimum: false,
      });
      expect(movements.data.total).toBe(2);
      expect(
        movements.data.items.map((m: any) => [m.type, m.quantity, m.reason]),
      ).toStrictEqual([
        ['ADJUSTMENT', -3, 'Avaria'],
        ['IN', 10, null],
      ]);
    });

    it('409: ajuste que deixaria o saldo negativo não grava nada', async () => {
      const { id } = await create();
      await receive(id, 2);

      const response = await adjust(id, -5);
      const detail = await readEnvelope(await call(`/products/${id}`));

      expect(response.status).toBe(409);
      expect(detail.data.stockQuantity).toBe(2);
      expect(ctx.stockMovements.items).toHaveLength(1);
    });

    it.each([
      ['entrada com quantidade 0', 'entries', { quantity: 0 }],
      ['entrada fracionada', 'entries', { quantity: 1.5 }],
      ['ajuste sem motivo', 'adjustments', { quantity: -1 }],
      [
        'ajuste com motivo em branco',
        'adjustments',
        { quantity: -1, reason: '  ' },
      ],
      ['ajuste com delta 0', 'adjustments', { quantity: 0, reason: 'X' }],
    ])('400: %s', async (_, kind, body) => {
      const { id } = await create();
      await receive(id, 5);

      const response = await call(`/products/${id}/stock/${kind}`, { body });

      expect(response.status).toBe(400);
    });

    it('404: movimentação de produto inexistente', async () => {
      expect((await receive(UNKNOWN_ID, 1)).status).toBe(404);
      expect((await adjust(UNKNOWN_ID, 1)).status).toBe(404);
      expect(
        (
          await call(`/products/${UNKNOWN_ID}/stock-movements`, {
            method: 'QUERY',
            body: {},
          })
        ).status,
      ).toBe(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('200: exclui produto sem histórico', async () => {
      const { id } = await create();

      const response = await call(`/products/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(200);
      expect((await call(`/products/${id}`)).status).toBe(404);
    });

    it('409: produto com movimentação de estoque', async () => {
      const { id } = await create();
      await receive(id, 1);

      const response = await call(`/products/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(409);
    });

    it('404: produto inexistente', async () => {
      expect(
        (await call(`/products/${UNKNOWN_ID}`, { method: 'DELETE' })).status,
      ).toBe(404);
    });
  });
});
