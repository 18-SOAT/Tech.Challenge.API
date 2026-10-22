import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { ProductErrorCode } from '../../src/modules/inventory/domain/errors/product.error.js';
import { PrismaProductRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-product.repository.js';
import { ApproveQuoteUseCase } from '../../src/modules/service-order/application/use-cases/approve-quote.use-case.js';
import { RejectQuoteUseCase } from '../../src/modules/service-order/application/use-cases/reject-quote.use-case.js';
import { ServiceOrderErrorCode } from '../../src/modules/service-order/domain/errors/service-order.error.js';
import { PrismaOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order.repository.js';
import { PrismaServiceOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order.repository.js';
import { PrismaServiceOrderApprovalRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order-approval.repository.js';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import { prepareTestDatabase, resetDatabase } from './database.js';
import {
  ADMIN,
  OWNER,
  openQuote,
  PRODUCT_ID,
  seedWorkshop,
} from './fixtures.js';

// Contra Postgres real: prova o que os fakes não provam — a transação do adapter
// desfaz de verdade (rollback) e o update condicional segura a corrida.
// Rodar com `bun run test:integration` (ver README / CLAUDE.md).

const codeOf = (code: string) => expect.objectContaining({ code });

describe('Aprovação do orçamento (Postgres)', () => {
  let prisma: PrismaClient;
  let serviceOrders: PrismaServiceOrderRepository;
  let orders: PrismaOrderRepository;
  let products: PrismaProductRepository;
  let approval: PrismaServiceOrderApprovalRepository;
  let approve: ApproveQuoteUseCase;
  let reject: RejectQuoteUseCase;
  let serviceOrderId: string;
  let orderId: string;

  const snapshot = async () => ({
    serviceOrder: await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: serviceOrderId },
      include: { statusHistory: true },
    }),
    order: await prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    stock: (
      await prisma.product.findUniqueOrThrow({ where: { id: PRODUCT_ID } })
    ).stockQuantity,
    movements: await prisma.stockMovement.findMany(),
  });

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
    serviceOrders = new PrismaServiceOrderRepository(prisma);
    orders = new PrismaOrderRepository(prisma);
    products = new PrismaProductRepository(prisma);
    approval = new PrismaServiceOrderApprovalRepository(prisma);
    approve = new ApproveQuoteUseCase(
      serviceOrders,
      orders,
      products,
      approval,
    );
    reject = new RejectQuoteUseCase(serviceOrders, orders, approval);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedWorkshop(prisma);
    ({ orderId, serviceOrderId } = await openQuote(prisma));
  });

  it('aprova: valor, status, histórico, baixa de estoque e Ordem gravados juntos', async () => {
    await approve.execute({ serviceOrderId, decider: OWNER });

    const after = await snapshot();
    expect(after.serviceOrder.status).toBe('IN_EXECUTION');
    expect(after.serviceOrder.approvedAmount?.toNumber()).toBe(160.9);
    expect(after.serviceOrder.approvedAt).toBeInstanceOf(Date);
    expect(
      after.serviceOrder.statusHistory.map((row) => row.status).sort(),
    ).toEqual(['AWAITING_APPROVAL', 'IN_DIAGNOSIS', 'IN_EXECUTION']);
    expect(after.stock).toBe(8);
    expect(after.movements).toHaveLength(1);
    expect(after.movements[0]).toMatchObject({
      type: 'OUT',
      quantity: 2,
      serviceOrderId,
    });
    expect(after.order.status).toBe('IN_PROGRESS');
  });

  it('saldo acabou entre a leitura e a gravação: rollback de tudo', async () => {
    // O use case leu saldo 10 (Product.withdraw passa); outra baixa deixa 1 no
    // banco antes da transação. O update condicional do estoque falha DEPOIS de a
    // OS já ter sido atualizada dentro da transação — o rollback desfaz as duas.
    const serviceOrder = await serviceOrders.findById(serviceOrderId);
    const order = await orders.findById(orderId);
    const product = await products.findById(PRODUCT_ID);
    if (!serviceOrder || !order || !product) throw new Error('seed incompleto');
    serviceOrder.approve(null);
    const movement = product.withdraw(2, serviceOrderId);
    order.start();
    await prisma.product.update({
      where: { id: PRODUCT_ID },
      data: { stockQuantity: 1 },
    });

    await expect(
      approval.approve(serviceOrder, order, [movement]),
    ).rejects.toThrow(codeOf(ProductErrorCode.INSUFFICIENT_STOCK));

    const after = await snapshot();
    expect(after.serviceOrder.status).toBe('AWAITING_APPROVAL');
    expect(after.serviceOrder.approvedAmount).toBeNull();
    expect(after.serviceOrder.statusHistory).toHaveLength(2);
    expect(after.stock).toBe(1);
    expect(after.movements).toHaveLength(0);
    expect(after.order.status).toBe('RECEIVED');
  });

  it('duas aprovações simultâneas: só uma passa e o estoque baixa uma vez', async () => {
    const results = await Promise.allSettled([
      approve.execute({ serviceOrderId, decider: OWNER }),
      approve.execute({ serviceOrderId, decider: OWNER }),
    ]);

    const failed = results.filter((result) => result.status === 'rejected');
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toEqual(
      codeOf(ServiceOrderErrorCode.NOT_AWAITING_APPROVAL),
    );
    const after = await snapshot();
    expect(after.stock).toBe(8);
    expect(after.movements).toHaveLength(1);
    expect(after.serviceOrder.statusHistory).toHaveLength(3);
  });

  it('aprovar e rejeitar ao mesmo tempo: só a primeira decisão fica', async () => {
    const results = await Promise.allSettled([
      approve.execute({ serviceOrderId, decider: OWNER }),
      reject.execute({ serviceOrderId, decider: ADMIN }),
    ]);

    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const after = await snapshot();
    expect(['IN_EXECUTION', 'REJECTED']).toContain(after.serviceOrder.status);
    expect(after.serviceOrder.statusHistory).toHaveLength(3);
    expect(after.stock).toBe(after.serviceOrder.status === 'REJECTED' ? 10 : 8);
  });
});
