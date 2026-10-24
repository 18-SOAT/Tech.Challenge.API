import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ADMIN_ACTOR,
  MECHANIC_ACTOR,
  makeService,
  makeServiceOrderWorld,
} from '../../../../../test/fakes/service-order-fixtures.js';
import { Order } from '../../domain/entities/order.entity.js';
import { ServiceItem } from '../../domain/entities/service-item.entity.js';
import { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderStatusHistory } from '../../domain/entities/service-order-status-history.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { ProgressStage } from '../../domain/enums/progress-stage.enum.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { OrderErrorCode } from '../../domain/errors/order.error.js';
import { FindOrderByIdUseCase } from './find-order-by-id.use-case.js';
import { GetExecutionTimeUseCase } from './get-execution-time.use-case.js';
import { ListOrdersUseCase } from './list-orders.use-case.js';
import { ListServiceOrderQueueUseCase } from './list-service-order-queue.use-case.js';
import { ListServiceOrdersUseCase } from './list-service-orders.use-case.js';

const MINUTE = 60_000;
const day = (n: number) => new Date(Date.UTC(2026, 9, n, 10));
const page = { page: 1, limit: 20 };

const makeOrder = (
  id: string,
  receivedDay: number,
  customerId = 'customer-1',
) =>
  Order.restore({
    id,
    number: receivedDay,
    customerId,
    vehicleId: `vehicle-${id}`,
    status: OrderStatus.IN_PROGRESS,
    notes: null,
    receivedAt: day(receivedDay),
    deliveredAt: null,
  });

// OS restaurada com o histórico coerente com o status. `executionMinutes` define o
// intervalo IN_EXECUTION → FINISHED das finalizadas.
const makeServiceOrder = (input: {
  id: string;
  orderId: string;
  status: ServiceOrderStatus;
  assigneeId?: string | null;
  createdDay?: number;
  serviceIds?: string[];
  executionMinutes?: number;
}) => {
  const createdAt = day(input.createdDay ?? 1);
  const at = (minutes: number) =>
    new Date(createdAt.getTime() + minutes * MINUTE);
  const history = [
    ServiceOrderStatusHistory.restore({
      id: `${input.id}-h1`,
      status: ServiceOrderStatus.IN_DIAGNOSIS,
      changedById: null,
      changedAt: createdAt,
    }),
  ];
  if (input.status === ServiceOrderStatus.FINISHED) {
    history.push(
      ServiceOrderStatusHistory.restore({
        id: `${input.id}-h2`,
        status: ServiceOrderStatus.IN_EXECUTION,
        changedById: null,
        changedAt: at(10),
      }),
      ServiceOrderStatusHistory.restore({
        id: `${input.id}-h3`,
        status: ServiceOrderStatus.FINISHED,
        changedById: 'mechanic-1',
        changedAt: at(10 + (input.executionMinutes ?? 60)),
      }),
    );
  }
  return ServiceOrder.restore({
    id: input.id,
    orderId: input.orderId,
    assigneeId:
      input.assigneeId === undefined ? 'mechanic-1' : input.assigneeId,
    status: input.status,
    description: null,
    approvedAmount: input.status === ServiceOrderStatus.FINISHED ? 89.9 : null,
    approvedAt: null,
    createdAt,
    services: (input.serviceIds ?? ['service-1']).map((serviceId) =>
      ServiceItem.restore({
        id: `${input.id}-${serviceId}`,
        serviceId,
        quantity: 1,
        unitPrice: 89.9,
      }),
    ),
    products: [],
    history,
  });
};

const ids = (items: { idValue: string }[]) => items.map((i) => i.idValue);

describe('Consultas de OS e Ordens', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;

  beforeEach(() => {
    world = makeServiceOrderWorld();
    world.orders.items.push(
      makeOrder('order-old', 1),
      makeOrder('order-new', 5, 'customer-2'),
    );
  });

  describe('listagem de OS', () => {
    beforeEach(() => {
      world.serviceOrders.items.push(
        makeServiceOrder({
          id: 'so-1',
          orderId: 'order-old',
          status: ServiceOrderStatus.IN_DIAGNOSIS,
          createdDay: 1,
        }),
        makeServiceOrder({
          id: 'so-2',
          orderId: 'order-new',
          status: ServiceOrderStatus.AWAITING_APPROVAL,
          assigneeId: 'mechanic-2',
          createdDay: 5,
        }),
        makeServiceOrder({
          id: 'so-3',
          orderId: 'order-new',
          status: ServiceOrderStatus.FINISHED,
          createdDay: 6,
        }),
      );
    });

    const list = (
      input: Partial<Parameters<ListServiceOrdersUseCase['execute']>[0]>,
    ) =>
      new ListServiceOrdersUseCase(world.serviceOrders).execute({
        actor: ADMIN_ACTOR,
        ...page,
        ...input,
      });

    it('ADMIN vê todas, das mais novas para as mais antigas', async () => {
      const result = await list({});
      expect(result.total).toBe(3);
      expect(ids(result.items)).toEqual(['so-3', 'so-2', 'so-1']);
    });

    it('filtra por status, mecânico, cliente e período', async () => {
      expect(
        ids((await list({ status: ServiceOrderStatus.IN_DIAGNOSIS })).items),
      ).toEqual(['so-1']);
      expect(ids((await list({ assigneeId: 'mechanic-2' })).items)).toEqual([
        'so-2',
      ]);
      expect(ids((await list({ customerId: 'customer-2' })).items)).toEqual([
        'so-3',
        'so-2',
      ]);
      expect(
        ids((await list({ createdFrom: day(2), createdTo: day(5) })).items),
      ).toEqual(['so-2']);
    });

    it('MECHANIC só recebe as OS dele, mesmo pedindo as de outro', async () => {
      const result = await list({
        actor: MECHANIC_ACTOR,
        assigneeId: 'mechanic-2',
      });
      expect(ids(result.items)).toEqual(['so-3', 'so-1']);
    });

    it('pagina mantendo o total do filtro', async () => {
      const result = await list({ page: 2, limit: 2 });
      expect(result.total).toBe(3);
      expect(ids(result.items)).toEqual(['so-1']);
    });
  });

  describe('fila de OS', () => {
    beforeEach(() => {
      world.serviceOrders.items.push(
        makeServiceOrder({
          id: 'diag-old',
          orderId: 'order-old',
          status: ServiceOrderStatus.IN_DIAGNOSIS,
        }),
        makeServiceOrder({
          id: 'exec-new',
          orderId: 'order-new',
          status: ServiceOrderStatus.IN_EXECUTION,
        }),
        makeServiceOrder({
          id: 'exec-old',
          orderId: 'order-old',
          status: ServiceOrderStatus.IN_EXECUTION,
        }),
        makeServiceOrder({
          id: 'waiting',
          orderId: 'order-new',
          status: ServiceOrderStatus.AWAITING_APPROVAL,
          assigneeId: 'mechanic-2',
        }),
        makeServiceOrder({
          id: 'done',
          orderId: 'order-old',
          status: ServiceOrderStatus.FINISHED,
        }),
        makeServiceOrder({
          id: 'rejected',
          orderId: 'order-old',
          status: ServiceOrderStatus.REJECTED,
        }),
      );
    });

    const queue = (actor = ADMIN_ACTOR, assigneeId?: string) =>
      new ListServiceOrderQueueUseCase(world.serviceOrders).execute({
        actor,
        assigneeId,
        ...page,
      });

    it('execução → aguardando aprovação → diagnóstico; Ordem mais antiga primeiro; sem terminais', async () => {
      const result = await queue();
      expect(result.total).toBe(4);
      expect(ids(result.items)).toEqual([
        'exec-old',
        'exec-new',
        'waiting',
        'diag-old',
      ]);
    });

    it('MECHANIC vê a fila dele; ADMIN filtra a de um mecânico', async () => {
      expect(ids((await queue(MECHANIC_ACTOR, 'mechanic-2')).items)).toEqual([
        'exec-old',
        'exec-new',
        'diag-old',
      ]);
      expect(ids((await queue(ADMIN_ACTOR, 'mechanic-2')).items)).toEqual([
        'waiting',
      ]);
    });
  });

  describe('Ordens', () => {
    it('lista as Ordens das mais recentes para as mais antigas, com filtros', async () => {
      const useCase = new ListOrdersUseCase(world.orders);
      expect(ids((await useCase.execute(page)).items)).toEqual([
        'order-new',
        'order-old',
      ]);
      expect(
        ids(
          (await useCase.execute({ ...page, customerId: 'customer-2' })).items,
        ),
      ).toEqual(['order-new']);
      expect(
        ids((await useCase.execute({ ...page, receivedTo: day(2) })).items),
      ).toEqual(['order-old']);
    });

    it('detalha a Ordem com as OS, os totais e o andamento', async () => {
      world.serviceOrders.items.push(
        makeServiceOrder({
          id: 'so-finished',
          orderId: 'order-old',
          status: ServiceOrderStatus.FINISHED,
        }),
        makeServiceOrder({
          id: 'so-waiting',
          orderId: 'order-old',
          status: ServiceOrderStatus.AWAITING_APPROVAL,
          createdDay: 2,
        }),
      );

      const detail = await new FindOrderByIdUseCase(
        world.orders,
        world.serviceOrders,
      ).execute({ id: 'order-old' });

      expect(detail.order.idValue).toBe('order-old');
      expect(ids(detail.serviceOrders)).toEqual(['so-finished', 'so-waiting']);
      expect(detail.quotedTotal.value).toBe(179.8);
      expect(detail.approvedTotal.value).toBe(89.9);
      expect(detail.stage).toBe(ProgressStage.AWAITING_APPROVAL);
    });

    it('Ordem inexistente: ORDER_NOT_FOUND', async () => {
      expect(
        new FindOrderByIdUseCase(world.orders, world.serviceOrders).execute({
          id: 'nope',
        }),
      ).rejects.toMatchObject({ code: OrderErrorCode.NOT_FOUND });
    });
  });

  describe('tempo médio de execução', () => {
    beforeEach(() => {
      world.services.items.push(makeService('service-2', 150));
      world.serviceOrders.items.push(
        makeServiceOrder({
          id: 'fast',
          orderId: 'order-old',
          status: ServiceOrderStatus.FINISHED,
          createdDay: 1,
          executionMinutes: 30,
        }),
        makeServiceOrder({
          id: 'slow',
          orderId: 'order-new',
          status: ServiceOrderStatus.FINISHED,
          createdDay: 5,
          serviceIds: ['service-1', 'service-2'],
          executionMinutes: 90,
        }),
        makeServiceOrder({
          id: 'running',
          orderId: 'order-new',
          status: ServiceOrderStatus.IN_EXECUTION,
        }),
      );
    });

    const report = (input = {}) =>
      new GetExecutionTimeUseCase(world.serviceOrders, world.services).execute(
        input,
      );

    it('média global e por serviço, com o serviço do catálogo', async () => {
      const result = await report();
      expect(result.global).toEqual({ averageMs: 60 * MINUTE, count: 2 });
      expect(
        result.byService.map((row) => ({
          serviceId: row.serviceId,
          averageMs: row.averageMs,
          count: row.count,
          name: row.service?.nameValue,
        })),
      ).toEqual([
        {
          serviceId: 'service-1',
          averageMs: 60 * MINUTE,
          count: 2,
          name: 'Troca de óleo',
        },
        {
          serviceId: 'service-2',
          averageMs: 90 * MINUTE,
          count: 1,
          name: 'Troca de óleo',
        },
      ]);
    });

    it('filtra pelo período da finalização', async () => {
      const result = await report({ finishedFrom: day(3) });
      expect(result.global).toEqual({ averageMs: 90 * MINUTE, count: 1 });
    });

    it('com serviceId: só as OS com o serviço e só a linha dele', async () => {
      const result = await report({ serviceId: 'service-2' });
      expect(result.global.count).toBe(1);
      expect(result.byService.map((row) => row.serviceId)).toEqual([
        'service-2',
      ]);
    });
  });
});
