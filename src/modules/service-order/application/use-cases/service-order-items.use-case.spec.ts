import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ADMIN_ACTOR,
  MECHANIC_ACTOR,
  makeServiceOrderWorld,
  OTHER_MECHANIC_ACTOR,
} from '../../../../../test/fakes/service-order-fixtures.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import { ProductErrorCode } from '../../../inventory/domain/errors/product.error.js';
import { ServiceErrorCode } from '../../../inventory/domain/errors/service.error.js';
import { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderErrorCode } from '../../domain/errors/service-order.error.js';
import { AddProductItemUseCase } from './add-product-item.use-case.js';
import { AddServiceItemUseCase } from './add-service-item.use-case.js';
import { ChangeItemQuantityUseCase } from './change-item-quantity.use-case.js';
import { FindServiceOrderByIdUseCase } from './find-service-order-by-id.use-case.js';
import { RemoveItemUseCase } from './remove-item.use-case.js';

// Os use cases de item seguem o mesmo roteiro (carrega, checa o ator, delega à
// entity, grava): um spec só cobre os quatro e o detalhe.
describe('Itens da OS', () => {
  let world: ReturnType<typeof makeServiceOrderWorld>;
  let serviceOrder: ServiceOrder;
  let addService: AddServiceItemUseCase;
  let addProduct: AddProductItemUseCase;
  let changeQuantity: ChangeItemQuantityUseCase;
  let removeItem: RemoveItemUseCase;
  let findById: FindServiceOrderByIdUseCase;

  const notFound = expect.objectContaining({
    code: ServiceOrderErrorCode.NOT_FOUND,
  });
  const notYours = expect.objectContaining({
    code: ServiceOrderErrorCode.NOT_ASSIGNED_TO_YOU,
  });

  beforeEach(() => {
    world = makeServiceOrderWorld();
    addService = new AddServiceItemUseCase(world.serviceOrders, world.services);
    addProduct = new AddProductItemUseCase(world.serviceOrders, world.products);
    changeQuantity = new ChangeItemQuantityUseCase(world.serviceOrders);
    removeItem = new RemoveItemUseCase(world.serviceOrders);
    findById = new FindServiceOrderByIdUseCase(world.serviceOrders);

    serviceOrder = ServiceOrder.create({
      orderId: 'order-1',
      createdById: 'admin-1',
    });
    serviceOrder.assign({ id: 'mechanic-1', role: EmployeeRole.MECHANIC });
    world.serviceOrders.items.push(serviceOrder);
  });

  describe('AddServiceItemUseCase / AddProductItemUseCase', () => {
    it('o mecânico responsável inclui serviço e peça com preço snapshot', async () => {
      await addService.execute({
        serviceOrderId: serviceOrder.idValue,
        serviceId: 'service-1',
        quantity: 1,
        actor: MECHANIC_ACTOR,
      });
      const updated = await addProduct.execute({
        serviceOrderId: serviceOrder.idValue,
        productId: 'product-1',
        quantity: 2,
        actor: MECHANIC_ACTOR,
      });

      expect(updated.servicesValue[0]?.unitPriceValue.value).toBe(89.9);
      expect(updated.productsValue[0]?.unitPriceValue.value).toBe(35.5);
      expect(updated.total.value).toBe(160.9);
    });

    it('o ADMIN também inclui', async () => {
      const updated = await addService.execute({
        serviceOrderId: serviceOrder.idValue,
        serviceId: 'service-1',
        quantity: 1,
        actor: ADMIN_ACTOR,
      });
      expect(updated.servicesValue).toHaveLength(1);
    });

    it('outro mecânico não inclui', async () => {
      await expect(
        addService.execute({
          serviceOrderId: serviceOrder.idValue,
          serviceId: 'service-1',
          quantity: 1,
          actor: OTHER_MECHANIC_ACTOR,
        }),
      ).rejects.toThrow(notYours);
      await expect(
        addProduct.execute({
          serviceOrderId: serviceOrder.idValue,
          productId: 'product-1',
          quantity: 1,
          actor: OTHER_MECHANIC_ACTOR,
        }),
      ).rejects.toThrow(notYours);
    });

    it('item do catálogo ou OS inexistentes: 404', async () => {
      await expect(
        addService.execute({
          serviceOrderId: serviceOrder.idValue,
          serviceId: 'missing',
          quantity: 1,
          actor: ADMIN_ACTOR,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: ServiceErrorCode.NOT_FOUND }),
      );
      await expect(
        addProduct.execute({
          serviceOrderId: serviceOrder.idValue,
          productId: 'missing',
          quantity: 1,
          actor: ADMIN_ACTOR,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: ProductErrorCode.NOT_FOUND }),
      );
      await expect(
        addService.execute({
          serviceOrderId: 'missing',
          serviceId: 'service-1',
          quantity: 1,
          actor: ADMIN_ACTOR,
        }),
      ).rejects.toThrow(notFound);
      await expect(
        addProduct.execute({
          serviceOrderId: 'missing',
          productId: 'product-1',
          quantity: 1,
          actor: ADMIN_ACTOR,
        }),
      ).rejects.toThrow(notFound);
    });
  });

  describe('ChangeItemQuantityUseCase / RemoveItemUseCase', () => {
    let itemId: string;

    beforeEach(async () => {
      const updated = await addService.execute({
        serviceOrderId: serviceOrder.idValue,
        serviceId: 'service-1',
        quantity: 1,
        actor: ADMIN_ACTOR,
      });
      itemId = updated.servicesValue[0]?.idValue ?? '';
    });

    it('altera a quantidade e remove o item', async () => {
      const changed = await changeQuantity.execute({
        serviceOrderId: serviceOrder.idValue,
        itemId,
        quantity: 3,
        actor: MECHANIC_ACTOR,
      });
      expect(changed.servicesValue[0]?.quantityValue).toBe(3);

      const removed = await removeItem.execute({
        serviceOrderId: serviceOrder.idValue,
        itemId,
        actor: MECHANIC_ACTOR,
      });
      expect(removed.servicesValue).toHaveLength(0);
    });

    it('outro mecânico não altera nem remove', async () => {
      await expect(
        changeQuantity.execute({
          serviceOrderId: serviceOrder.idValue,
          itemId,
          quantity: 3,
          actor: OTHER_MECHANIC_ACTOR,
        }),
      ).rejects.toThrow(notYours);
      await expect(
        removeItem.execute({
          serviceOrderId: serviceOrder.idValue,
          itemId,
          actor: OTHER_MECHANIC_ACTOR,
        }),
      ).rejects.toThrow(notYours);
    });

    it('OS inexistente: 404', async () => {
      await expect(
        changeQuantity.execute({
          serviceOrderId: 'missing',
          itemId,
          quantity: 3,
          actor: ADMIN_ACTOR,
        }),
      ).rejects.toThrow(notFound);
      await expect(
        removeItem.execute({
          serviceOrderId: 'missing',
          itemId,
          actor: ADMIN_ACTOR,
        }),
      ).rejects.toThrow(notFound);
    });
  });

  describe('FindServiceOrderByIdUseCase', () => {
    it('ADMIN e mecânico responsável veem; outro mecânico não', async () => {
      expect(
        (
          await findById.execute({
            id: serviceOrder.idValue,
            actor: ADMIN_ACTOR,
          })
        ).idValue,
      ).toBe(serviceOrder.idValue);
      expect(
        (
          await findById.execute({
            id: serviceOrder.idValue,
            actor: MECHANIC_ACTOR,
          })
        ).idValue,
      ).toBe(serviceOrder.idValue);
      await expect(
        findById.execute({
          id: serviceOrder.idValue,
          actor: OTHER_MECHANIC_ACTOR,
        }),
      ).rejects.toThrow(notYours);
    });

    it('OS inexistente: 404', async () => {
      await expect(
        findById.execute({ id: 'missing', actor: ADMIN_ACTOR }),
      ).rejects.toThrow(notFound);
    });
  });
});
