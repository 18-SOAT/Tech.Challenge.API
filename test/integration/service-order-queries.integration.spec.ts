import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { ServiceOrderStatus } from '../../src/modules/service-order/domain/enums/service-order-status.enum.js';
import { PrismaOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order.repository.js';
import { PrismaServiceOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order.repository.js';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import { prepareTestDatabase, resetDatabase } from './database.js';
import {
  CUSTOMER_ID,
  MECHANIC_ID,
  SERVICE_ID,
  seedWorkshop,
  VEHICLE_ID,
} from './fixtures.js';

// Contra Postgres real: a ordenação da fila é SQL próprio ($queryRaw com
// array_position), e os filtros por join (cliente da Ordem, FINISHED no histórico)
// só o banco prova — o fake reimplementa a regra, não a query.

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 10));
const uuid = (suffix: string) =>
  `01920000-0000-7000-8000-${suffix.padStart(12, '0')}`;

describe('Consultas de OS (Postgres)', () => {
  let prisma: PrismaClient;
  let serviceOrders: PrismaServiceOrderRepository;
  let orders: PrismaOrderRepository;

  const insertOrder = (id: string, receivedDay: number) =>
    prisma.order.create({
      data: {
        id,
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
        status: 'IN_PROGRESS',
        receivedAt: day(receivedDay),
      },
    });

  // OS com histórico coerente; as finalizadas levam `minutes` de execução.
  const insertServiceOrder = async (input: {
    id: string;
    orderId: string;
    status:
      | 'IN_DIAGNOSIS'
      | 'AWAITING_APPROVAL'
      | 'IN_EXECUTION'
      | 'FINISHED'
      | 'REJECTED';
    assigneeId?: string | null;
    finishedDay?: number;
    minutes?: number;
  }) => {
    await prisma.serviceOrder.create({
      data: {
        id: input.id,
        orderId: input.orderId,
        status: input.status,
        assigneeId:
          input.assigneeId === undefined ? MECHANIC_ID : input.assigneeId,
        services: {
          create: {
            id: uuid(`${input.id.slice(-4)}1`),
            serviceId: SERVICE_ID,
            unitPrice: '89.90',
          },
        },
      },
    });
    if (input.status === 'FINISHED') {
      const finishedAt = day(input.finishedDay ?? 1);
      await prisma.serviceOrderStatusHistory.createMany({
        data: [
          {
            id: uuid(`${input.id.slice(-4)}2`),
            serviceOrderId: input.id,
            status: 'IN_EXECUTION',
            changedAt: new Date(
              finishedAt.getTime() - (input.minutes ?? 60) * 60_000,
            ),
          },
          {
            id: uuid(`${input.id.slice(-4)}3`),
            serviceOrderId: input.id,
            status: 'FINISHED',
            changedAt: finishedAt,
          },
        ],
      });
    }
  };

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
    serviceOrders = new PrismaServiceOrderRepository(prisma);
    orders = new PrismaOrderRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedWorkshop(prisma);
    await insertOrder(uuid('a1'), 1); // chegou antes
    await insertOrder(uuid('a2'), 5);
  });

  it('fila: prioridade do domínio, chegada da Ordem e sem terminais; pagina pelo SQL', async () => {
    await insertServiceOrder({
      id: uuid('1001'),
      orderId: uuid('a1'),
      status: 'IN_DIAGNOSIS',
    });
    await insertServiceOrder({
      id: uuid('1002'),
      orderId: uuid('a2'),
      status: 'IN_EXECUTION',
    });
    await insertServiceOrder({
      id: uuid('1003'),
      orderId: uuid('a1'),
      status: 'IN_EXECUTION',
    });
    await insertServiceOrder({
      id: uuid('1004'),
      orderId: uuid('a2'),
      status: 'AWAITING_APPROVAL',
      assigneeId: null,
    });
    await insertServiceOrder({
      id: uuid('1005'),
      orderId: uuid('a1'),
      status: 'FINISHED',
    });
    await insertServiceOrder({
      id: uuid('1006'),
      orderId: uuid('a1'),
      status: 'REJECTED',
    });

    const all = await serviceOrders.findQueue({ page: 1, limit: 20 });
    expect(all.total).toBe(4);
    expect(all.items.map((so) => so.idValue)).toEqual([
      uuid('1003'),
      uuid('1002'),
      uuid('1004'),
      uuid('1001'),
    ]);

    const second = await serviceOrders.findQueue({ page: 2, limit: 2 });
    expect(second.total).toBe(4);
    expect(second.items.map((so) => so.idValue)).toEqual([
      uuid('1004'),
      uuid('1001'),
    ]);

    const mine = await serviceOrders.findQueue({
      page: 1,
      limit: 20,
      assigneeId: MECHANIC_ID,
    });
    expect(mine.total).toBe(3);
    expect(mine.items.map((so) => so.idValue)).not.toContain(uuid('1004'));
  });

  it('listagem: filtro pelo cliente da Ordem (join) e por status', async () => {
    await insertServiceOrder({
      id: uuid('2001'),
      orderId: uuid('a1'),
      status: 'IN_DIAGNOSIS',
    });
    await insertServiceOrder({
      id: uuid('2002'),
      orderId: uuid('a2'),
      status: 'FINISHED',
    });

    const byCustomer = await serviceOrders.findMany({
      page: 1,
      limit: 20,
      customerId: CUSTOMER_ID,
    });
    expect(byCustomer.total).toBe(2);

    const finished = await serviceOrders.findMany({
      page: 1,
      limit: 20,
      status: ServiceOrderStatus.FINISHED,
    });
    expect(finished.items.map((so) => so.idValue)).toEqual([uuid('2002')]);

    const ordersPage = await orders.findMany({
      page: 1,
      limit: 20,
      receivedFrom: day(3),
    });
    expect(ordersPage.items.map((o) => o.idValue)).toEqual([uuid('a2')]);
  });

  it('finalizadas: período pelo FINISHED do histórico, com o agregado inteiro', async () => {
    await insertServiceOrder({
      id: uuid('3001'),
      orderId: uuid('a1'),
      status: 'FINISHED',
      finishedDay: 2,
      minutes: 30,
    });
    await insertServiceOrder({
      id: uuid('3002'),
      orderId: uuid('a2'),
      status: 'FINISHED',
      finishedDay: 8,
      minutes: 90,
    });
    await insertServiceOrder({
      id: uuid('3003'),
      orderId: uuid('a2'),
      status: 'IN_EXECUTION',
    });

    const recent = await serviceOrders.findFinished({ finishedFrom: day(5) });
    expect(recent.map((so) => so.idValue)).toEqual([uuid('3002')]);
    expect(recent[0]?.executionTime).toBe(90 * 60_000);

    const withService = await serviceOrders.findFinished({
      serviceId: SERVICE_ID,
    });
    expect(withService).toHaveLength(2);
  });
});
