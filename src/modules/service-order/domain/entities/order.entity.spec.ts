import { describe, expect, it } from 'bun:test';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import { OrderStatus } from '../enums/order-status.enum.js';
import { OrderErrorCode } from '../errors/order.error.js';
import { Order } from './order.entity.js';

describe('Order', () => {
  const restore = (status: OrderStatus) =>
    Order.restore({
      id: 'order-1',
      number: 7,
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status,
      notes: null,
      receivedAt: new Date('2026-10-20T10:00:00Z'),
      deliveredAt: null,
    });

  describe('open', () => {
    it('nasce Recebida, sem número (vem do banco) e com as observações aparadas', () => {
      const order = Order.open({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        notes: '  barulho na suspensão ',
      });

      expect(order.idValue).toBeString();
      expect(order.numberValue).toBeNull();
      expect(order.customerIdValue).toBe('customer-1');
      expect(order.vehicleIdValue).toBe('vehicle-1');
      expect(order.statusValue).toBe(OrderStatus.RECEIVED);
      expect(order.notesValue).toBe('barulho na suspensão');
      expect(order.receivedAtValue).toBeInstanceOf(Date);
      expect(order.deliveredAtValue).toBeNull();
    });

    it('observação em branco vira null', () => {
      const order = Order.open({
        customerId: 'c',
        vehicleId: 'v',
        notes: '   ',
      });
      expect(order.notesValue).toBeNull();
    });
  });

  describe('assertAcceptsServiceOrders', () => {
    it('aceita reparo adicional enquanto o veículo está na oficina', () => {
      expect(() =>
        restore(OrderStatus.IN_PROGRESS).assertAcceptsServiceOrders(),
      ).not.toThrow();
      expect(restore(OrderStatus.RECEIVED).numberValue).toBe(7);
    });

    it('recusa depois da entrega', () => {
      const order = restore(OrderStatus.DELIVERED);
      expect(order.isDelivered).toBeTrue();
      expect(() => order.assertAcceptsServiceOrders()).toThrow(
        expect.objectContaining({ code: OrderErrorCode.ALREADY_DELIVERED }),
      );
    });
  });

  describe('assertQuoteCanBeDecidedBy', () => {
    const order = restore(OrderStatus.RECEIVED);

    it('o cliente dono da ordem e o ADMIN decidem', () => {
      expect(() =>
        order.assertQuoteCanBeDecidedBy({ customerId: 'customer-1' }),
      ).not.toThrow();
      expect(() =>
        order.assertQuoteCanBeDecidedBy({
          employeeId: 'admin-1',
          role: EmployeeRole.ADMIN,
        }),
      ).not.toThrow();
    });

    it('outro cliente e o MECHANIC não decidem', () => {
      const forbidden = expect.objectContaining({
        code: OrderErrorCode.QUOTE_DECISION_FORBIDDEN,
      });
      expect(() =>
        order.assertQuoteCanBeDecidedBy({ customerId: 'customer-2' }),
      ).toThrow(forbidden);
      expect(() =>
        order.assertQuoteCanBeDecidedBy({
          employeeId: 'mechanic-1',
          role: EmployeeRole.MECHANIC,
        }),
      ).toThrow(forbidden);
    });
  });

  describe('start', () => {
    it.each([OrderStatus.RECEIVED, OrderStatus.IN_PROGRESS])(
      'de %s fica Em andamento',
      (status) => {
        const order = restore(status);
        order.start();
        expect(order.statusValue).toBe(OrderStatus.IN_PROGRESS);
      },
    );

    it('recusa depois da entrega', () => {
      expect(() => restore(OrderStatus.DELIVERED).start()).toThrow(
        expect.objectContaining({ code: OrderErrorCode.ALREADY_DELIVERED }),
      );
    });
  });
});
