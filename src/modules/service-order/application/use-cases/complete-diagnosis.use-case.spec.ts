import { beforeEach, describe, expect, it } from 'bun:test';
import {
  CUSTOMER_DOCUMENT,
  MECHANIC_ACTOR,
  makeServiceOrderWorld,
  OTHER_MECHANIC_ACTOR,
  VEHICLE_PLATE,
} from '../../../../../test/fakes/service-order-fixtures.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { ServiceOrderErrorCode } from '../../domain/errors/service-order.error.js';
import { CompleteDiagnosisUseCase } from './complete-diagnosis.use-case.js';
import { OpenOrderUseCase } from './open-order.use-case.js';

// O e-mail sai fire-and-forget: espera a fila de microtasks esvaziar.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CompleteDiagnosisUseCase', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;
  let useCase: CompleteDiagnosisUseCase;
  let serviceOrder: ServiceOrder;

  beforeEach(async () => {
    world = makeServiceOrderWorld();
    useCase = new CompleteDiagnosisUseCase(
      world.serviceOrders,
      world.orders,
      world.customers,
      world.services,
      world.products,
      world.mailer,
    );
    ({ serviceOrder } = await new OpenOrderUseCase(
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
    }));
    serviceOrder.assign({ id: 'mechanic-1', role: EmployeeRole.MECHANIC });
    const filter = await world.products.findById('product-1');
    if (filter) serviceOrder.addProduct(filter, 2);
  });

  it('gera o orçamento e envia ao e-mail do cliente', async () => {
    const updated = await useCase.execute({
      serviceOrderId: serviceOrder.idValue,
      actor: MECHANIC_ACTOR,
    });
    await flush();

    expect(updated.statusValue).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
    expect(updated.historyValue.at(-1)?.changedByIdValue).toBe('mechanic-1');
    expect(world.mailer.sent).toHaveLength(1);
    const quote = world.mailer.sent[0];
    expect(quote?.to).toBe('joao@oficina.com');
    expect(quote?.orderNumber).toBe(1);
    expect(quote?.serviceOrderId).toBe(serviceOrder.idValue);
    expect(quote?.lines.map((line) => line.name)).toEqual([
      'Troca de óleo',
      'Filtro de óleo',
    ]);
    expect(quote?.lines[1]?.subtotal.value).toBe(71);
    expect(quote?.total.value).toBe(160.9);
  });

  it('item que sumiu do catálogo ainda sai no e-mail, com nome genérico', async () => {
    world.services.items.length = 0;
    world.products.items.length = 0;

    await useCase.execute({
      serviceOrderId: serviceOrder.idValue,
      actor: MECHANIC_ACTOR,
    });
    await flush();

    expect(world.mailer.sent[0]?.lines.map((line) => line.name)).toEqual([
      'Serviço',
      'Produto',
    ]);
  });

  it('falha no e-mail não desfaz o orçamento', async () => {
    world.mailer.failNext = true;
    const updated = await useCase.execute({
      serviceOrderId: serviceOrder.idValue,
      actor: MECHANIC_ACTOR,
    });
    await flush();

    expect(updated.statusValue).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
    expect(world.mailer.sent).toHaveLength(0);
  });

  it('sem Ordem ou cliente, não há para quem enviar', async () => {
    world.customers.items.length = 0;
    await useCase.execute({
      serviceOrderId: serviceOrder.idValue,
      actor: MECHANIC_ACTOR,
    });
    await flush();
    expect(world.mailer.sent).toHaveLength(0);
  });

  it('sem Ordem gravada, também não envia', async () => {
    world.orders.items.length = 0;
    await useCase.execute({
      serviceOrderId: serviceOrder.idValue,
      actor: MECHANIC_ACTOR,
    });
    await flush();
    expect(world.mailer.sent).toHaveLength(0);
  });

  it('outro mecânico não conclui', async () => {
    await expect(
      useCase.execute({
        serviceOrderId: serviceOrder.idValue,
        actor: OTHER_MECHANIC_ACTOR,
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: ServiceOrderErrorCode.NOT_ASSIGNED_TO_YOU,
      }),
    );
  });

  it('OS inexistente: 404', async () => {
    await expect(
      useCase.execute({ serviceOrderId: 'missing', actor: MECHANIC_ACTOR }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ServiceOrderErrorCode.NOT_FOUND }),
    );
  });
});
