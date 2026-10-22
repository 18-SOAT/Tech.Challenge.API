import { beforeEach, describe, expect, it } from 'bun:test';
import { makeServiceOrderWorld } from '../../../../../test/fakes/service-order-fixtures.js';
import { EmployeeErrorCode } from '../../../employee/domain/errors/employee.error.js';
import { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderErrorCode } from '../../domain/errors/service-order.error.js';
import { AssignMechanicUseCase } from './assign-mechanic.use-case.js';

describe('AssignMechanicUseCase', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;
  let useCase: AssignMechanicUseCase;
  let serviceOrder: ServiceOrder;

  beforeEach(() => {
    world = makeServiceOrderWorld();
    useCase = new AssignMechanicUseCase(world.serviceOrders, world.employees);
    serviceOrder = ServiceOrder.create({
      orderId: 'order-1',
      createdById: 'admin-1',
    });
    world.serviceOrders.items.push(serviceOrder);
  });

  it('atribui o mecânico e grava', async () => {
    const updated = await useCase.execute({
      serviceOrderId: serviceOrder.idValue,
      mechanicId: 'mechanic-1',
    });

    expect(updated.assigneeIdValue).toBe('mechanic-1');
    expect(
      (await world.serviceOrders.findById(serviceOrder.idValue))
        ?.assigneeIdValue,
    ).toBe('mechanic-1');
  });

  it('recusa funcionário ADMIN', async () => {
    await expect(
      useCase.execute({
        serviceOrderId: serviceOrder.idValue,
        mechanicId: 'admin-1',
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: ServiceOrderErrorCode.ASSIGNEE_NOT_MECHANIC,
      }),
    );
  });

  it('OS ou funcionário inexistentes: 404', async () => {
    await expect(
      useCase.execute({ serviceOrderId: 'missing', mechanicId: 'mechanic-1' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ServiceOrderErrorCode.NOT_FOUND }),
    );
    await expect(
      useCase.execute({
        serviceOrderId: serviceOrder.idValue,
        mechanicId: 'missing',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: EmployeeErrorCode.NOT_FOUND }),
    );
  });
});
