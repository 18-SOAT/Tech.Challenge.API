import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { PrismaProductRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-product.repository.js';
import { PrismaServiceRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-service.repository.js';
import { ApproveQuoteUseCase } from '../../src/modules/service-order/application/use-cases/approve-quote.use-case.js';
import { DeliverOrderUseCase } from '../../src/modules/service-order/application/use-cases/deliver-order.use-case.js';
import { FindMyOrderUseCase } from '../../src/modules/service-order/application/use-cases/find-my-order.use-case.js';
import { FinishServiceOrderUseCase } from '../../src/modules/service-order/application/use-cases/finish-service-order.use-case.js';
import { ListMyOrdersUseCase } from '../../src/modules/service-order/application/use-cases/list-my-orders.use-case.js';
import { OpenAdditionalServiceOrderUseCase } from '../../src/modules/service-order/application/use-cases/open-additional-service-order.use-case.js';
import { ProgressStage } from '../../src/modules/service-order/domain/enums/progress-stage.enum.js';
import { ServiceOrderErrorCode } from '../../src/modules/service-order/domain/errors/service-order.error.js';
import { PrismaOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order.repository.js';
import { PrismaOrderDeliveryRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order-delivery.repository.js';
import { PrismaServiceOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order.repository.js';
import { PrismaServiceOrderApprovalRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order-approval.repository.js';
import { PrismaVehicleRepository } from '../../src/modules/vehicle/infrastructure/persistence/prisma-vehicle.repository.js';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import { prepareTestDatabase, resetDatabase } from './database.js';
import {
  ADMIN,
  ADMIN_ID,
  MECHANIC,
  OWNER,
  openQuote,
  seedWorkshop,
} from './fixtures.js';

// Contra Postgres real: o lock otimista do save() da OS e o FOR UPDATE da Ordem
// (entrega × reparo adicional) — o que o fake não consegue reproduzir.

const codeOf = (code: string) => expect.objectContaining({ code });

describe('Acompanhamento da OS (Postgres)', () => {
  let prisma: PrismaClient;
  let serviceOrders: PrismaServiceOrderRepository;
  let orders: PrismaOrderRepository;
  let finish: FinishServiceOrderUseCase;
  let deliver: DeliverOrderUseCase;
  let openAdditional: OpenAdditionalServiceOrderUseCase;
  let serviceOrderId: string;
  let orderId: string;

  const historyOf = (id: string) =>
    prisma.serviceOrderStatusHistory.findMany({
      where: { serviceOrderId: id },
    });

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
    serviceOrders = new PrismaServiceOrderRepository(prisma);
    orders = new PrismaOrderRepository(prisma);
    finish = new FinishServiceOrderUseCase(serviceOrders);
    deliver = new DeliverOrderUseCase(
      orders,
      serviceOrders,
      new PrismaOrderDeliveryRepository(prisma),
    );
    openAdditional = new OpenAdditionalServiceOrderUseCase(
      orders,
      serviceOrders,
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  // Orçamento gerado e aprovado: a OS está em execução.
  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedWorkshop(prisma);
    ({ orderId, serviceOrderId } = await openQuote(prisma));
    await new ApproveQuoteUseCase(
      serviceOrders,
      orders,
      new PrismaProductRepository(prisma),
      new PrismaServiceOrderApprovalRepository(prisma),
    ).execute({ serviceOrderId, decider: OWNER });
  });

  it('OS lida antes de outra transição: o save() recusa com 409 e não grava nada', async () => {
    const stale = await serviceOrders.findById(serviceOrderId);
    if (!stale) throw new Error('OS não encontrada');
    await finish.execute({ serviceOrderId, actor: MECHANIC });

    stale.finish(ADMIN_ID);
    await expect(serviceOrders.save(stale)).rejects.toThrow(
      codeOf(ServiceOrderErrorCode.CONCURRENT_UPDATE),
    );
    const finished = (await historyOf(serviceOrderId)).filter(
      (row) => row.status === 'FINISHED',
    );
    expect(finished).toHaveLength(1);
  });

  it('duas finalizações simultâneas: um FINISHED só no histórico', async () => {
    const results = await Promise.allSettled([
      finish.execute({ serviceOrderId, actor: MECHANIC }),
      finish.execute({ serviceOrderId, actor: ADMIN }),
    ]);

    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const finished = (await historyOf(serviceOrderId)).filter(
      (row) => row.status === 'FINISHED',
    );
    expect(finished).toHaveLength(1);
  });

  it('entrega × reparo adicional ao mesmo tempo: nunca fica OS aberta numa Ordem entregue', async () => {
    await finish.execute({ serviceOrderId, actor: MECHANIC });

    const results = await Promise.allSettled([
      deliver.execute({ orderId }),
      openAdditional.execute({
        orderId,
        description: 'Barulho no freio',
        openedById: ADMIN_ID,
      }),
    ]);

    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    const open = await prisma.serviceOrder.count({
      where: { orderId, status: { notIn: ['FINISHED', 'REJECTED'] } },
    });
    if (order.status === 'DELIVERED') expect(open).toBe(0);
    else expect(open).toBe(1);
  });

  it('o cliente acompanha até a entrega, lendo pelos adapters Prisma', async () => {
    const vehicles = new PrismaVehicleRepository(prisma);
    const findMine = () =>
      new FindMyOrderUseCase(
        orders,
        serviceOrders,
        vehicles,
        new PrismaServiceRepository(prisma),
        new PrismaProductRepository(prisma),
      ).execute({ customerId: OWNER.customerId, orderId });

    expect((await findMine()).stage).toBe(ProgressStage.IN_EXECUTION);
    await finish.execute({ serviceOrderId, actor: MECHANIC });
    await deliver.execute({ orderId });

    const view = await findMine();
    expect(view.stage).toBe(ProgressStage.DELIVERED);
    expect(view.serviceOrders[0]?.lines?.map((line) => line.name)).toEqual([
      'Troca de óleo',
      'Filtro de óleo',
    ]);
    const list = await new ListMyOrdersUseCase(
      orders,
      serviceOrders,
      vehicles,
    ).execute(OWNER);
    expect(list.map((item) => item.order.idValue)).toEqual([orderId]);
  });
});
