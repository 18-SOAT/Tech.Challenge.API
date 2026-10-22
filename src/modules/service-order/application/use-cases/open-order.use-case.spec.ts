import { beforeEach, describe, expect, it } from 'bun:test';
import { makeCustomer } from '../../../../../test/fakes/auth-fixtures.js';
import {
  CUSTOMER_DOCUMENT,
  makeService,
  makeServiceOrderWorld,
  makeVehicle,
  VEHICLE_PLATE,
} from '../../../../../test/fakes/service-order-fixtures.js';
import { Customer } from '../../../customer/domain/entities/customer.entity.js';
import { CustomerErrorCode } from '../../../customer/domain/errors/customer.error.js';
import { ServiceErrorCode } from '../../../inventory/domain/errors/service.error.js';
import { VehicleErrorCode } from '../../../vehicle/domain/errors/vehicle.error.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { OrderErrorCode } from '../../domain/errors/order.error.js';
import { ServiceOrderErrorCode } from '../../domain/errors/service-order.error.js';
import { OpenOrderUseCase } from './open-order.use-case.js';

describe('OpenOrderUseCase', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;
  let useCase: OpenOrderUseCase;

  beforeEach(() => {
    world = makeServiceOrderWorld();
    useCase = new OpenOrderUseCase(
      world.customers,
      world.vehicles,
      world.services,
      world.orders,
      world.orderOpening,
    );
  });

  const open = (
    overrides: Partial<Parameters<OpenOrderUseCase['execute']>[0]> = {},
  ) =>
    useCase.execute({
      document: CUSTOMER_DOCUMENT,
      plate: VEHICLE_PLATE,
      openedById: 'admin-1',
      ...overrides,
    });

  it('abre a Ordem (Recebida) e a 1ª OS (Em diagnóstico) com os serviços pedidos', async () => {
    const { order, serviceOrder } = await open({
      plate: 'abc-1d23',
      notes: 'barulho no motor',
      description: 'revisão',
      services: [{ serviceId: 'service-1', quantity: 1 }],
    });

    expect(order.numberValue).toBe(1);
    expect(order.statusValue).toBe(OrderStatus.RECEIVED);
    expect(order.customerIdValue).toBe('customer-1');
    expect(order.vehicleIdValue).toBe('vehicle-1');
    expect(order.notesValue).toBe('barulho no motor');
    expect(serviceOrder.orderIdValue).toBe(order.idValue);
    expect(serviceOrder.statusValue).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
    expect(serviceOrder.historyValue[0]?.changedByIdValue).toBe('admin-1');
    expect(serviceOrder.total.value).toBe(89.9);
    expect(world.orders.items).toHaveLength(1);
    expect(world.serviceOrders.items).toHaveLength(1);
  });

  it('sem serviços: OS vazia, o mecânico inclui no diagnóstico', async () => {
    const { serviceOrder } = await open();
    expect(serviceOrder.servicesValue).toHaveLength(0);
  });

  it('documento ou placa inválidos falham antes de consultar', async () => {
    await expect(open({ document: '111.111.111-11' })).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.INVALID_DOCUMENT }),
    );
    await expect(open({ plate: 'XX' })).rejects.toThrow(
      expect.objectContaining({ code: VehicleErrorCode.INVALID_LICENSE_PLATE }),
    );
  });

  it('cliente ou veículo inexistentes: 404', async () => {
    world.customers.items.length = 0;
    await expect(open()).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.NOT_FOUND }),
    );

    world.customers.items.push(makeCustomer(null));
    world.vehicles.items.length = 0;
    await expect(open()).rejects.toThrow(
      expect.objectContaining({ code: VehicleErrorCode.NOT_FOUND }),
    );
  });

  it('recusa veículo de outro cliente', async () => {
    world.vehicles.items.length = 0;
    world.vehicles.items.push(makeVehicle('customer-2'));

    await expect(open()).rejects.toThrow(
      expect.objectContaining({
        code: OrderErrorCode.VEHICLE_NOT_OWNED_BY_CUSTOMER,
      }),
    );
  });

  it('recusa veículo que já está na oficina', async () => {
    await open();
    await expect(open()).rejects.toThrow(
      expect.objectContaining({ code: OrderErrorCode.VEHICLE_HAS_OPEN_ORDER }),
    );
    expect(world.orders.items).toHaveLength(1);
  });

  it('serviço inexistente ou inativo: nada é gravado', async () => {
    await expect(
      open({ services: [{ serviceId: 'missing', quantity: 1 }] }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ServiceErrorCode.NOT_FOUND }),
    );

    world.services.items.push(makeService('service-2', 50, false));
    await expect(
      open({ services: [{ serviceId: 'service-2', quantity: 1 }] }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: ServiceOrderErrorCode.INACTIVE_CATALOG_ITEM,
      }),
    );
    expect(world.orders.items).toHaveLength(0);
  });

  it('cliente de CNPJ também abre ordem', async () => {
    world.customers.items.length = 0;
    world.customers.items.push(
      Customer.restore({
        id: 'customer-1',
        userId: null,
        name: 'Transportadora',
        document: '11222333000181',
        email: 'frota@empresa.com',
        phone: null,
      }),
    );
    const { order } = await open({ document: '11.222.333/0001-81' });
    expect(order.customerIdValue).toBe('customer-1');
  });
});
