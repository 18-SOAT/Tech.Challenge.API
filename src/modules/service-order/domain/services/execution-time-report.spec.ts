import { describe, expect, it } from 'bun:test';
import { ServiceItem } from '../entities/service-item.entity.js';
import { ServiceOrder } from '../entities/service-order.entity.js';
import { ServiceOrderStatusHistory } from '../entities/service-order-status-history.entity.js';
import { ServiceOrderStatus } from '../enums/service-order-status.enum.js';
import { ExecutionTimeReport } from './execution-time-report.js';

const MINUTE = 60_000;
const start = new Date('2026-10-20T10:00:00Z');

const row = (status: ServiceOrderStatus, minutesAfterStart: number) =>
  ServiceOrderStatusHistory.restore({
    id: `${status}-${minutesAfterStart}`,
    status,
    changedById: null,
    changedAt: new Date(start.getTime() + minutesAfterStart * MINUTE),
  });

// OS com o histórico de uma execução de `minutes` minutos (ou sem finalizar).
const serviceOrder = (
  id: string,
  serviceIds: string[],
  minutes: number | null,
) =>
  ServiceOrder.restore({
    id,
    orderId: 'order-1',
    assigneeId: 'mechanic-1',
    status:
      minutes === null
        ? ServiceOrderStatus.IN_EXECUTION
        : ServiceOrderStatus.FINISHED,
    description: null,
    approvedAmount: 100,
    approvedAt: start,
    createdAt: start,
    services: serviceIds.map((serviceId) =>
      ServiceItem.restore({
        id: `${id}-${serviceId}`,
        serviceId,
        quantity: 1,
        unitPrice: 50,
      }),
    ),
    products: [],
    history: [
      row(ServiceOrderStatus.IN_DIAGNOSIS, -60),
      row(ServiceOrderStatus.AWAITING_APPROVAL, -30),
      row(ServiceOrderStatus.IN_EXECUTION, 0),
      ...(minutes === null ? [] : [row(ServiceOrderStatus.FINISHED, minutes)]),
    ],
  });

describe('ServiceOrder.executionTime', () => {
  it('é o intervalo entre IN_EXECUTION e FINISHED no histórico', () => {
    expect(serviceOrder('so-1', [], 90).executionTime).toBe(90 * MINUTE);
  });

  it('é null enquanto a OS não finalizou', () => {
    expect(serviceOrder('so-1', [], null).executionTime).toBeNull();
  });
});

describe('ExecutionTimeReport', () => {
  it('média global e por serviço; OS com vários serviços conta para cada um', () => {
    const report = ExecutionTimeReport.of([
      serviceOrder('so-1', ['oil'], 60),
      serviceOrder('so-2', ['oil', 'brake'], 120),
      serviceOrder('so-3', ['brake'], null),
    ]);

    expect(report.global).toEqual({ averageMs: 90 * MINUTE, count: 2 });
    expect(report.byService).toEqual([
      { serviceId: 'oil', averageMs: 90 * MINUTE, count: 2 },
      { serviceId: 'brake', averageMs: 120 * MINUTE, count: 1 },
    ]);
  });

  it('sem OS finalizada: média zero e contagem zero', () => {
    expect(ExecutionTimeReport.of([])).toEqual({
      global: { averageMs: 0, count: 0 },
      byService: [],
    });
  });
});
