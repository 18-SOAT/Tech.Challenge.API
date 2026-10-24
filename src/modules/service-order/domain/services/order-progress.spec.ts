import { describe, expect, it } from 'bun:test';
import { Order } from '../entities/order.entity.js';
import { ServiceOrder } from '../entities/service-order.entity.js';
import { OrderStatus } from '../enums/order-status.enum.js';
import { ProgressStage } from '../enums/progress-stage.enum.js';
import { ServiceOrderStatus } from '../enums/service-order-status.enum.js';
import { OrderProgress } from './order-progress.js';

const order = (status = OrderStatus.IN_PROGRESS) =>
  Order.restore({
    id: 'order-1',
    number: 1,
    customerId: 'customer-1',
    vehicleId: 'vehicle-1',
    status,
    notes: null,
    receivedAt: new Date(),
    deliveredAt: null,
  });

const serviceOrder = (
  status: ServiceOrderStatus,
  assigneeId: string | null = 'mechanic-1',
) =>
  ServiceOrder.restore({
    id: `so-${status}`,
    orderId: 'order-1',
    assigneeId,
    status,
    description: null,
    approvedAmount: null,
    approvedAt: null,
    createdAt: new Date(),
    services: [],
    products: [],
    history: [],
  });

describe('OrderProgress', () => {
  describe('ofServiceOrder', () => {
    it('em diagnóstico sem mecânico ainda é "Recebida"', () => {
      expect(
        OrderProgress.ofServiceOrder(
          serviceOrder(ServiceOrderStatus.IN_DIAGNOSIS, null),
        ),
      ).toBe(ProgressStage.RECEIVED);
    });

    it.each([
      [ServiceOrderStatus.IN_DIAGNOSIS, ProgressStage.IN_DIAGNOSIS],
      [ServiceOrderStatus.AWAITING_APPROVAL, ProgressStage.AWAITING_APPROVAL],
      [ServiceOrderStatus.IN_EXECUTION, ProgressStage.IN_EXECUTION],
      [ServiceOrderStatus.FINISHED, ProgressStage.FINISHED],
      [ServiceOrderStatus.REJECTED, ProgressStage.REJECTED],
    ])('%s → %s', (status, stage) => {
      expect(OrderProgress.ofServiceOrder(serviceOrder(status))).toBe(stage);
    });
  });

  describe('ofOrder', () => {
    it('Ordem entregue é "Entregue", seja qual for o estado das OS', () => {
      expect(
        OrderProgress.ofOrder(order(OrderStatus.DELIVERED), [
          serviceOrder(ServiceOrderStatus.FINISHED),
        ]),
      ).toBe(ProgressStage.DELIVERED);
    });

    it('a fase mais urgente vence: aprovação pendente antes da execução', () => {
      expect(
        OrderProgress.ofOrder(order(), [
          serviceOrder(ServiceOrderStatus.IN_EXECUTION),
          serviceOrder(ServiceOrderStatus.AWAITING_APPROVAL),
          serviceOrder(ServiceOrderStatus.FINISHED),
        ]),
      ).toBe(ProgressStage.AWAITING_APPROVAL);
      expect(
        OrderProgress.ofOrder(order(), [
          serviceOrder(ServiceOrderStatus.IN_DIAGNOSIS),
          serviceOrder(ServiceOrderStatus.IN_EXECUTION),
        ]),
      ).toBe(ProgressStage.IN_EXECUTION);
    });

    it('recém-aberta, sem mecânico: "Recebida"', () => {
      expect(
        OrderProgress.ofOrder(order(OrderStatus.RECEIVED), [
          serviceOrder(ServiceOrderStatus.IN_DIAGNOSIS, null),
        ]),
      ).toBe(ProgressStage.RECEIVED);
      expect(OrderProgress.ofOrder(order(OrderStatus.RECEIVED), [])).toBe(
        ProgressStage.RECEIVED,
      );
    });

    it('todas encerradas (finalizadas ou rejeitadas): "Finalizada"', () => {
      expect(
        OrderProgress.ofOrder(order(), [
          serviceOrder(ServiceOrderStatus.FINISHED),
          serviceOrder(ServiceOrderStatus.REJECTED),
        ]),
      ).toBe(ProgressStage.FINISHED);
    });
  });
});
