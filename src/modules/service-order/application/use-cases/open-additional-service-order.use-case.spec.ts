import { beforeEach, describe, expect, it } from 'bun:test';
import { makeServiceOrderWorld } from '../../../../../test/fakes/service-order-fixtures.js';
import { Order } from '../../domain/entities/order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { OrderErrorCode } from '../../domain/errors/order.error.js';
import { OpenAdditionalServiceOrderUseCase } from './open-additional-service-order.use-case.js';

const makeOrder = (status: OrderStatus) =>
  Order.restore({
    id: 'order-1',
    number: 1,
    customerId: 'customer-1',
    vehicleId: 'vehicle-1',
    status,
    notes: null,
    receivedAt: new Date(),
    deliveredAt: status === OrderStatus.DELIVERED ? new Date() : null,
  });

describe('OpenAdditionalServiceOrderUseCase', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;
  let useCase: OpenAdditionalServiceOrderUseCase;

  beforeEach(() => {
    world = makeServiceOrderWorld();
    useCase = new OpenAdditionalServiceOrderUseCase(
      world.orders,
      world.serviceOrders,
    );
  });

  it('cria uma OS nova em diagnóstico na mesma Ordem', async () => {
    world.orders.items.push(makeOrder(OrderStatus.IN_PROGRESS));

    const serviceOrder = await useCase.execute({
      orderId: 'order-1',
      description: 'barulho no freio',
      openedById: 'admin-1',
    });

    expect(serviceOrder.orderIdValue).toBe('order-1');
    expect(serviceOrder.statusValue).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
    expect(serviceOrder.descriptionValue).toBe('barulho no freio');
    expect(world.serviceOrders.items).toHaveLength(1);
  });

  it('recusa Ordem entregue', async () => {
    world.orders.items.push(makeOrder(OrderStatus.DELIVERED));
    await expect(
      useCase.execute({ orderId: 'order-1', openedById: 'admin-1' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: OrderErrorCode.ALREADY_DELIVERED }),
    );
  });

  it('Ordem inexistente: 404', async () => {
    await expect(
      useCase.execute({ orderId: 'missing', openedById: 'admin-1' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: OrderErrorCode.NOT_FOUND }),
    );
  });
});
