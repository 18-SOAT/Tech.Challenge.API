import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ADMIN_ACTOR,
  CUSTOMER_DOCUMENT,
  MECHANIC_ACTOR,
  makeServiceOrderWorld,
  VEHICLE_PLATE,
} from '../../../../../test/fakes/service-order-fixtures.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import { StockMovementType } from '../../../inventory/domain/enums/stock-movement-type.enum.js';
import { ProductErrorCode } from '../../../inventory/domain/errors/product.error.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { OrderErrorCode } from '../../domain/errors/order.error.js';
import { ServiceOrderErrorCode } from '../../domain/errors/service-order.error.js';
import { ApproveQuoteUseCase } from './approve-quote.use-case.js';
import { OpenOrderUseCase } from './open-order.use-case.js';
import { RejectQuoteUseCase } from './reject-quote.use-case.js';

const OWNER = { customerId: 'customer-1' };
const codeOf = (code: string) => expect.objectContaining({ code });

describe('Decisão do orçamento', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;
  let approve: ApproveQuoteUseCase;
  let reject: RejectQuoteUseCase;
  let serviceOrderId: string;
  let orderId: string;

  const stored = () =>
    world.serviceOrders.items.find((item) => item.idValue === serviceOrderId);
  const storedOrder = () =>
    world.orders.items.find((order) => order.idValue === orderId);
  const stock = () => world.products.items[0]?.stockQuantityValue;

  // Ordem aberta com 1 serviço + 2 filtros (saldo 10), orçamento gerado.
  beforeEach(async () => {
    world = makeServiceOrderWorld();
    approve = new ApproveQuoteUseCase(
      world.serviceOrders,
      world.orders,
      world.products,
      world.approval,
    );
    reject = new RejectQuoteUseCase(
      world.serviceOrders,
      world.orders,
      world.approval,
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
    if (filter) serviceOrder.addProduct(filter, 2);
    serviceOrder.completeDiagnosis('mechanic-1');
    await world.serviceOrders.save(serviceOrder);
    serviceOrderId = serviceOrder.idValue;
    orderId = order.idValue;
  });

  describe('aprovar', () => {
    it('o cliente aprova: valor congelado, estoque baixado e Ordem em andamento', async () => {
      const approved = await approve.execute({
        serviceOrderId,
        decider: OWNER,
      });

      expect(approved.statusValue).toBe(ServiceOrderStatus.IN_EXECUTION);
      expect(stored()?.statusValue).toBe(ServiceOrderStatus.IN_EXECUTION);
      expect(stored()?.approvedAmountValue?.value).toBe(160.9);
      expect(stored()?.historyValue.at(-1)?.changedByIdValue).toBeNull();
      expect(stock()).toBe(8);
      expect(world.stockMovements.items).toHaveLength(1);
      expect(world.stockMovements.items[0]?.typeValue).toBe(
        StockMovementType.OUT,
      );
      expect(world.stockMovements.items[0]?.serviceOrderIdValue).toBe(
        serviceOrderId,
      );
      expect(storedOrder()?.statusValue).toBe(OrderStatus.IN_PROGRESS);
    });

    it('o ADMIN registra a aprovação dada no balcão, com autoria no histórico', async () => {
      await approve.execute({ serviceOrderId, decider: ADMIN_ACTOR });
      expect(stored()?.historyValue.at(-1)?.changedByIdValue).toBe('admin-1');
    });

    it('saldo insuficiente: nada é gravado e a OS continua aguardando aprovação', async () => {
      world.products.setStock('product-1', 1);

      await expect(
        approve.execute({ serviceOrderId, decider: OWNER }),
      ).rejects.toThrow(codeOf(ProductErrorCode.INSUFFICIENT_STOCK));

      expect(stored()?.statusValue).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
      expect(stored()?.approvedAmountValue).toBeNull();
      expect(stock()).toBe(1);
      expect(world.stockMovements.items).toHaveLength(0);
      expect(storedOrder()?.statusValue).toBe(OrderStatus.RECEIVED);
    });

    it('depois de repor o estoque, o cliente aprova o mesmo orçamento', async () => {
      world.products.setStock('product-1', 1);
      await approve
        .execute({ serviceOrderId, decider: OWNER })
        .catch(() => undefined);
      world.products.setStock('product-1', 5);

      await approve.execute({ serviceOrderId, decider: OWNER });

      expect(stored()?.approvedAmountValue?.value).toBe(160.9);
      expect(stock()).toBe(3);
    });

    it('não aprova duas vezes', async () => {
      await approve.execute({ serviceOrderId, decider: OWNER });
      await expect(
        approve.execute({ serviceOrderId, decider: OWNER }),
      ).rejects.toThrow(codeOf(ServiceOrderErrorCode.NOT_AWAITING_APPROVAL));
      expect(stock()).toBe(8);
    });

    it('produto que sumiu do cadastro: 404 e nada é gravado', async () => {
      world.products.items.length = 0;
      await expect(
        approve.execute({ serviceOrderId, decider: OWNER }),
      ).rejects.toThrow(codeOf(ProductErrorCode.NOT_FOUND));
      expect(stored()?.statusValue).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
    });
  });

  describe('rejeitar', () => {
    it('o cliente rejeita: OS encerrada, sem baixa e sem iniciar a Ordem', async () => {
      const rejected = await reject.execute({ serviceOrderId, decider: OWNER });

      expect(rejected.statusValue).toBe(ServiceOrderStatus.REJECTED);
      expect(stored()?.statusValue).toBe(ServiceOrderStatus.REJECTED);
      expect(stock()).toBe(10);
      expect(storedOrder()?.statusValue).toBe(OrderStatus.RECEIVED);
    });

    it('não rejeita orçamento já aprovado', async () => {
      await approve.execute({ serviceOrderId, decider: OWNER });
      await expect(
        reject.execute({ serviceOrderId, decider: OWNER }),
      ).rejects.toThrow(codeOf(ServiceOrderErrorCode.NOT_AWAITING_APPROVAL));
    });
  });

  describe('quem decide', () => {
    it.each([
      ['outro cliente', { customerId: 'customer-2' }],
      ['o MECHANIC, mesmo o responsável', MECHANIC_ACTOR],
    ])('%s recebe 403 e nada muda', async (_, decider) => {
      await expect(
        approve.execute({ serviceOrderId, decider }),
      ).rejects.toThrow(codeOf(OrderErrorCode.QUOTE_DECISION_FORBIDDEN));
      await expect(reject.execute({ serviceOrderId, decider })).rejects.toThrow(
        codeOf(OrderErrorCode.QUOTE_DECISION_FORBIDDEN),
      );
      expect(stored()?.statusValue).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
    });

    it('o 403 vem antes do status: quem não decide não descobre o andamento', async () => {
      await approve.execute({ serviceOrderId, decider: OWNER });
      await expect(
        approve.execute({
          serviceOrderId,
          decider: { customerId: 'customer-2' },
        }),
      ).rejects.toThrow(codeOf(OrderErrorCode.QUOTE_DECISION_FORBIDDEN));
    });
  });

  it('aprovar e rejeitar ao mesmo tempo: só a primeira decisão é gravada', async () => {
    const results = await Promise.allSettled([
      approve.execute({ serviceOrderId, decider: OWNER }),
      reject.execute({ serviceOrderId, decider: ADMIN_ACTOR }),
    ]);

    const failed = results.filter((result) => result.status === 'rejected');
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toEqual(
      codeOf(ServiceOrderErrorCode.NOT_AWAITING_APPROVAL),
    );
    expect(stored()?.historyValue).toHaveLength(3);
  });

  it('OS inexistente: 404; Ordem que sumiu: 404', async () => {
    await expect(
      approve.execute({ serviceOrderId: 'missing', decider: OWNER }),
    ).rejects.toThrow(codeOf(ServiceOrderErrorCode.NOT_FOUND));

    world.orders.items.length = 0;
    await expect(
      reject.execute({ serviceOrderId, decider: OWNER }),
    ).rejects.toThrow(codeOf(OrderErrorCode.NOT_FOUND));
  });
});
