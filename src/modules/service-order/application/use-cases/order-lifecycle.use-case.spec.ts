import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ADMIN_ACTOR,
  CUSTOMER_DOCUMENT,
  MECHANIC_ACTOR,
  makeServiceOrderWorld,
  OTHER_MECHANIC_ACTOR,
  VEHICLE_PLATE,
} from '../../../../../test/fakes/service-order-fixtures.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { ProgressStage } from '../../domain/enums/progress-stage.enum.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { OrderErrorCode } from '../../domain/errors/order.error.js';
import { ServiceOrderErrorCode } from '../../domain/errors/service-order.error.js';
import { ApproveQuoteUseCase } from './approve-quote.use-case.js';
import { DeliverOrderUseCase } from './deliver-order.use-case.js';
import { FindMyOrderUseCase } from './find-my-order.use-case.js';
import { FinishServiceOrderUseCase } from './finish-service-order.use-case.js';
import { ListMyOrdersUseCase } from './list-my-orders.use-case.js';
import { OpenOrderUseCase } from './open-order.use-case.js';
import { RejectQuoteUseCase } from './reject-quote.use-case.js';

const OWNER = { customerId: 'customer-1' };
const codeOf = (code: string) => expect.objectContaining({ code });

describe('Acompanhamento da OS', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;
  let finish: FinishServiceOrderUseCase;
  let deliver: DeliverOrderUseCase;
  let serviceOrderId: string;
  let orderId: string;

  const stored = () =>
    world.serviceOrders.items.find((item) => item.idValue === serviceOrderId);
  const storedOrder = () =>
    world.orders.items.find((order) => order.idValue === orderId);

  const approve = () =>
    new ApproveQuoteUseCase(
      world.serviceOrders,
      world.orders,
      world.products,
      world.approval,
    ).execute({ serviceOrderId, decider: OWNER });

  // Ordem aberta com 1 serviço + 1 filtro, mecânico atribuído, orçamento gerado.
  beforeEach(async () => {
    world = makeServiceOrderWorld();
    finish = new FinishServiceOrderUseCase(world.serviceOrders);
    deliver = new DeliverOrderUseCase(
      world.orders,
      world.serviceOrders,
      world.delivery,
    );
    const { order, serviceOrder } = await new OpenOrderUseCase(
      world.customers,
      world.vehicles,
      world.services,
      world.orders,
      world.orderOpening,
    ).execute({
      document: CUSTOMER_DOCUMENT,
      plate: VEHICLE_PLATE,
      openedById: 'admin-1',
      services: [{ serviceId: 'service-1', quantity: 1 }],
    });
    serviceOrder.assign({ id: 'mechanic-1', role: EmployeeRole.MECHANIC });
    const filter = await world.products.findById('product-1');
    if (filter) serviceOrder.addProduct(filter, 1);
    serviceOrder.completeDiagnosis('mechanic-1');
    await world.serviceOrders.save(serviceOrder);
    serviceOrderId = serviceOrder.idValue;
    orderId = order.idValue;
  });

  describe('finalizar', () => {
    it('o mecânico responsável finaliza a OS em execução', async () => {
      await approve();

      const finished = await finish.execute({
        serviceOrderId,
        actor: MECHANIC_ACTOR,
      });

      expect(finished.statusValue).toBe(ServiceOrderStatus.FINISHED);
      expect(stored()?.statusValue).toBe(ServiceOrderStatus.FINISHED);
      expect(stored()?.historyValue.at(-1)?.changedByIdValue).toBe(
        'mechanic-1',
      );
    });

    it('outro mecânico não finaliza; antes da aprovação, 409', async () => {
      await expect(
        finish.execute({ serviceOrderId, actor: MECHANIC_ACTOR }),
      ).rejects.toThrow(codeOf(ServiceOrderErrorCode.NOT_IN_EXECUTION));

      await approve();
      await expect(
        finish.execute({ serviceOrderId, actor: OTHER_MECHANIC_ACTOR }),
      ).rejects.toThrow(codeOf(ServiceOrderErrorCode.NOT_ASSIGNED_TO_YOU));
    });

    it('duas finalizações ao mesmo tempo: o lock otimista deixa passar uma', async () => {
      await approve();

      const results = await Promise.allSettled([
        finish.execute({ serviceOrderId, actor: MECHANIC_ACTOR }),
        finish.execute({ serviceOrderId, actor: ADMIN_ACTOR }),
      ]);

      const failed = results.filter((result) => result.status === 'rejected');
      expect(failed).toHaveLength(1);
      expect((failed[0] as PromiseRejectedResult).reason).toEqual(
        codeOf(ServiceOrderErrorCode.CONCURRENT_UPDATE),
      );
      const finishedRows = stored()?.historyValue.filter(
        (row) => row.statusValue === ServiceOrderStatus.FINISHED,
      );
      expect(finishedRows).toHaveLength(1);
    });

    it('OS inexistente: 404', async () => {
      await expect(
        finish.execute({ serviceOrderId: 'missing', actor: ADMIN_ACTOR }),
      ).rejects.toThrow(codeOf(ServiceOrderErrorCode.NOT_FOUND));
    });
  });

  describe('entregar', () => {
    it('entrega com todas as OS encerradas', async () => {
      await approve();
      await finish.execute({ serviceOrderId, actor: MECHANIC_ACTOR });

      const delivered = await deliver.execute({ orderId });

      expect(delivered.statusValue).toBe(OrderStatus.DELIVERED);
      expect(storedOrder()?.statusValue).toBe(OrderStatus.DELIVERED);
      expect(storedOrder()?.deliveredAtValue).toBeInstanceOf(Date);
    });

    it('orçamento rejeitado: a Ordem vai de Recebida para Entregue', async () => {
      await new RejectQuoteUseCase(
        world.serviceOrders,
        world.orders,
        world.approval,
      ).execute({ serviceOrderId, decider: OWNER });

      await deliver.execute({ orderId });

      expect(storedOrder()?.statusValue).toBe(OrderStatus.DELIVERED);
    });

    it('recusa com OS em execução e não entrega duas vezes', async () => {
      await approve();
      await expect(deliver.execute({ orderId })).rejects.toThrow(
        codeOf(OrderErrorCode.HAS_OPEN_SERVICE_ORDERS),
      );

      await finish.execute({ serviceOrderId, actor: MECHANIC_ACTOR });
      await deliver.execute({ orderId });
      await expect(deliver.execute({ orderId })).rejects.toThrow(
        codeOf(OrderErrorCode.ALREADY_DELIVERED),
      );
    });

    it('reparo adicional gravado depois da leitura: o repositório recusa a entrega', async () => {
      await approve();
      await finish.execute({ serviceOrderId, actor: MECHANIC_ACTOR });
      const order = await world.orders.findById(orderId);
      if (!order) throw new Error('ordem não encontrada');
      order.deliver([ServiceOrderStatus.FINISHED]);
      await world.serviceOrders.create(
        ServiceOrder.create({ orderId, createdById: 'admin-1' }),
      );

      await expect(world.delivery.deliver(order)).rejects.toThrow(
        codeOf(OrderErrorCode.HAS_OPEN_SERVICE_ORDERS),
      );
      expect(storedOrder()?.statusValue).toBe(OrderStatus.IN_PROGRESS);
    });

    it('Ordem inexistente: 404', async () => {
      await expect(deliver.execute({ orderId: 'missing' })).rejects.toThrow(
        codeOf(OrderErrorCode.NOT_FOUND),
      );
    });
  });

  describe('consulta do cliente', () => {
    const listMine = () =>
      new ListMyOrdersUseCase(
        world.orders,
        world.serviceOrders,
        world.vehicles,
      ).execute(OWNER);
    const findMine = (customerId = 'customer-1', id = orderId) =>
      new FindMyOrderUseCase(
        world.orders,
        world.serviceOrders,
        world.vehicles,
        world.services,
        world.products,
      ).execute({ customerId, orderId: id });

    it('lista as ordens do cliente com o estágio do enunciado', async () => {
      const [view] = await listMine();

      expect(view?.order.idValue).toBe(orderId);
      expect(view?.vehicle?.plateValue).toBe(VEHICLE_PLATE);
      expect(view?.stage).toBe(ProgressStage.AWAITING_APPROVAL);
      expect(view?.serviceOrders[0]?.stage).toBe(
        ProgressStage.AWAITING_APPROVAL,
      );
      expect(view?.serviceOrders[0]?.lines).toBeUndefined();
    });

    it('outro cliente não tem ordens', async () => {
      const views = await new ListMyOrdersUseCase(
        world.orders,
        world.serviceOrders,
        world.vehicles,
      ).execute({ customerId: 'customer-2' });
      expect(views).toEqual([]);
    });

    it('o detalhe traz o orçamento com nome e preço de cada item', async () => {
      const view = await findMine();

      expect(view.serviceOrders[0]?.lines?.map((line) => line.name)).toEqual([
        'Troca de óleo',
        'Filtro de óleo',
      ]);
      expect(view.serviceOrders[0]?.serviceOrder.total.value).toBe(125.4);
    });

    it('acompanha até a entrega', async () => {
      await approve();
      expect((await findMine()).stage).toBe(ProgressStage.IN_EXECUTION);
      await finish.execute({ serviceOrderId, actor: MECHANIC_ACTOR });
      expect((await findMine()).stage).toBe(ProgressStage.FINISHED);
      await deliver.execute({ orderId });
      expect((await findMine()).stage).toBe(ProgressStage.DELIVERED);
    });

    it('ordem de outro cliente ou inexistente: 404', async () => {
      await expect(findMine('customer-2')).rejects.toThrow(
        codeOf(OrderErrorCode.NOT_FOUND),
      );
      await expect(findMine('customer-1', 'missing')).rejects.toThrow(
        codeOf(OrderErrorCode.NOT_FOUND),
      );
    });
  });
});
