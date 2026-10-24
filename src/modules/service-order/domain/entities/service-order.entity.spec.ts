import { describe, expect, it } from 'bun:test';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import { Product } from '../../../inventory/domain/entities/product.entity.js';
import { Service } from '../../../inventory/domain/entities/service.entity.js';
import { ProductType } from '../../../inventory/domain/enums/product-type.enum.js';
import { ServiceOrderStatus } from '../enums/service-order-status.enum.js';
import { ServiceOrderErrorCode } from '../errors/service-order.error.js';
import { ProductItem } from './product-item.entity.js';
import { ServiceItem } from './service-item.entity.js';
import { ServiceOrder } from './service-order.entity.js';
import { ServiceOrderStatusHistory } from './service-order-status-history.entity.js';

const MECHANIC = { id: 'mechanic-1', role: EmployeeRole.MECHANIC };

const oilChange = () =>
  Service.create({ name: 'Troca de óleo', price: Money.fromReais(89.9) });

const brakePad = () =>
  Product.create({
    sku: 'PAST-01',
    name: 'Pastilha de freio',
    type: ProductType.PART,
    price: Money.fromReais(0.1),
  });

const create = () =>
  ServiceOrder.create({
    orderId: 'order-1',
    description: '  revisão ',
    createdById: 'admin-1',
  });

const codeOf = (code: ServiceOrderErrorCode) =>
  expect.objectContaining({ code });

// OS já com orçamento gerado, para testar o que é proibido depois do diagnóstico.
const awaitingApproval = () => {
  const serviceOrder = create();
  serviceOrder.assign(MECHANIC);
  serviceOrder.addService(oilChange(), 1);
  serviceOrder.completeDiagnosis(MECHANIC.id);
  return serviceOrder;
};

const restoreWithStatus = (status: ServiceOrderStatus) =>
  ServiceOrder.restore({
    id: 'so-1',
    orderId: 'order-1',
    assigneeId: null,
    status,
    description: null,
    approvedAmount: 89.9,
    approvedAt: new Date(),
    createdAt: new Date(),
    services: [
      ServiceItem.restore({
        id: 'item-1',
        serviceId: 'service-1',
        quantity: 1,
        unitPrice: 89.9,
      }),
    ],
    products: [
      ProductItem.restore({
        id: 'item-2',
        productId: 'product-1',
        quantity: 2,
        unitPrice: 10,
      }),
    ],
    history: [
      ServiceOrderStatusHistory.restore({
        id: 'h-1',
        status,
        changedById: null,
        changedAt: new Date(),
      }),
    ],
  });

describe('ServiceOrder', () => {
  describe('create', () => {
    it('nasce em diagnóstico, sem responsável, com a 1ª linha do histórico', () => {
      const serviceOrder = create();

      expect(serviceOrder.idValue).toBeString();
      expect(serviceOrder.orderIdValue).toBe('order-1');
      expect(serviceOrder.statusValue).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
      expect(serviceOrder.assigneeIdValue).toBeNull();
      expect(serviceOrder.descriptionValue).toBe('revisão');
      expect(serviceOrder.approvedAmountValue).toBeNull();
      expect(serviceOrder.approvedAtValue).toBeNull();
      expect(serviceOrder.createdAtValue).toBeInstanceOf(Date);
      expect(serviceOrder.total.cents).toBe(0);
      expect(serviceOrder.historyValue).toHaveLength(1);
      expect(serviceOrder.historyValue[0]?.statusValue).toBe(
        ServiceOrderStatus.IN_DIAGNOSIS,
      );
      expect(serviceOrder.historyValue[0]?.changedByIdValue).toBe('admin-1');
    });
  });

  describe('restore', () => {
    it('reconstrói itens, valor aprovado e histórico', () => {
      const serviceOrder = restoreWithStatus(ServiceOrderStatus.IN_EXECUTION);

      expect(serviceOrder.approvedAmountValue?.value).toBe(89.9);
      expect(serviceOrder.servicesValue[0]?.serviceIdValue).toBe('service-1');
      expect(serviceOrder.productsValue[0]?.productIdValue).toBe('product-1');
      expect(serviceOrder.total.value).toBe(109.9);
      expect(serviceOrder.historyValue[0]?.idValue).toBe('h-1');
      expect(serviceOrder.historyValue[0]?.changedAtValue).toBeInstanceOf(Date);
    });

    it('sem valor aprovado fica null', () => {
      const serviceOrder = ServiceOrder.restore({
        id: 'so-1',
        orderId: 'order-1',
        assigneeId: null,
        status: ServiceOrderStatus.IN_DIAGNOSIS,
        description: null,
        approvedAmount: null,
        approvedAt: null,
        createdAt: new Date(),
        services: [],
        products: [],
        history: [],
      });
      expect(serviceOrder.approvedAmountValue).toBeNull();
    });
  });

  describe('assign', () => {
    it('atribui o mecânico responsável', () => {
      const serviceOrder = create();
      serviceOrder.assign(MECHANIC);
      expect(serviceOrder.assigneeIdValue).toBe('mechanic-1');
    });

    it('troca o responsável mesmo depois do orçamento', () => {
      const serviceOrder = awaitingApproval();
      serviceOrder.assign({ id: 'mechanic-2', role: EmployeeRole.MECHANIC });
      expect(serviceOrder.assigneeIdValue).toBe('mechanic-2');
    });

    it('recusa funcionário que não é MECHANIC', () => {
      expect(() =>
        create().assign({ id: 'admin-1', role: EmployeeRole.ADMIN }),
      ).toThrow(codeOf(ServiceOrderErrorCode.ASSIGNEE_NOT_MECHANIC));
    });

    it.each([ServiceOrderStatus.FINISHED, ServiceOrderStatus.REJECTED])(
      'recusa OS fechada (%s)',
      (status) => {
        const serviceOrder = restoreWithStatus(status);
        expect(serviceOrder.isClosed).toBeTrue();
        expect(() => serviceOrder.assign(MECHANIC)).toThrow(
          codeOf(ServiceOrderErrorCode.ALREADY_CLOSED),
        );
      },
    );
  });

  describe('assertCanBeWorkedBy', () => {
    it('ADMIN trabalha em qualquer OS', () => {
      expect(() =>
        create().assertCanBeWorkedBy({
          employeeId: 'admin-1',
          role: EmployeeRole.ADMIN,
        }),
      ).not.toThrow();
    });

    it('MECHANIC trabalha só na OS atribuída a ele', () => {
      const serviceOrder = create();
      serviceOrder.assign(MECHANIC);

      expect(() =>
        serviceOrder.assertCanBeWorkedBy({
          employeeId: 'mechanic-1',
          role: EmployeeRole.MECHANIC,
        }),
      ).not.toThrow();
      expect(() =>
        serviceOrder.assertCanBeWorkedBy({
          employeeId: 'mechanic-2',
          role: EmployeeRole.MECHANIC,
        }),
      ).toThrow(codeOf(ServiceOrderErrorCode.NOT_ASSIGNED_TO_YOU));
    });

    it('MECHANIC não trabalha em OS sem responsável', () => {
      expect(() =>
        create().assertCanBeWorkedBy({
          employeeId: 'mechanic-1',
          role: EmployeeRole.MECHANIC,
        }),
      ).toThrow(codeOf(ServiceOrderErrorCode.NOT_ASSIGNED_TO_YOU));
    });
  });

  describe('addService / addProduct', () => {
    it('copia o preço do catálogo (snapshot) e soma o total em centavos', () => {
      const serviceOrder = create();
      const service = oilChange();
      const product = brakePad();

      const serviceItem = serviceOrder.addService(service, 1);
      const productItem = serviceOrder.addProduct(product, 3);
      // Mudar o catálogo depois não altera o item já incluído.
      service.update({ price: Money.fromReais(120) });

      expect(serviceItem.serviceIdValue).toBe(service.idValue);
      expect(serviceItem.unitPriceValue.value).toBe(89.9);
      expect(productItem.productIdValue).toBe(product.idValue);
      expect(productItem.quantityValue).toBe(3);
      expect(productItem.subtotal.value).toBe(0.3);
      // 89.90 + 3 × 0.10 = 90.20, exato (no float daria 90.20000000000002).
      expect(serviceOrder.total.value).toBe(90.2);
    });

    it('o mesmo item de novo soma na quantidade, sem duplicar a linha', () => {
      const serviceOrder = create();
      const service = oilChange();
      const product = brakePad();

      serviceOrder.addService(service, 1);
      serviceOrder.addService(service, 2);
      serviceOrder.addProduct(product, 1);
      serviceOrder.addProduct(product, 4);

      expect(serviceOrder.servicesValue).toHaveLength(1);
      expect(serviceOrder.servicesValue[0]?.quantityValue).toBe(3);
      expect(serviceOrder.productsValue).toHaveLength(1);
      expect(serviceOrder.productsValue[0]?.quantityValue).toBe(5);
    });

    it.each([0, -1, 1.5])('recusa quantidade inválida (%p)', (quantity) => {
      const serviceOrder = create();
      expect(() => serviceOrder.addService(oilChange(), quantity)).toThrow(
        codeOf(ServiceOrderErrorCode.INVALID_QUANTITY),
      );
      expect(() => serviceOrder.addProduct(brakePad(), quantity)).toThrow(
        codeOf(ServiceOrderErrorCode.INVALID_QUANTITY),
      );
    });

    it('recusa item inativo do catálogo', () => {
      const service = oilChange();
      service.deactivate();
      const product = brakePad();
      product.deactivate();

      expect(() => create().addService(service, 1)).toThrow(
        codeOf(ServiceOrderErrorCode.INACTIVE_CATALOG_ITEM),
      );
      expect(() => create().addProduct(product, 1)).toThrow(
        codeOf(ServiceOrderErrorCode.INACTIVE_CATALOG_ITEM),
      );
    });

    it('recusa incluir depois do orçamento gerado', () => {
      const serviceOrder = awaitingApproval();
      expect(() => serviceOrder.addService(oilChange(), 1)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_IN_DIAGNOSIS),
      );
      expect(() => serviceOrder.addProduct(brakePad(), 1)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_IN_DIAGNOSIS),
      );
    });
  });

  describe('changeItemQuantity', () => {
    it('altera serviço ou produto, mantendo o preço unitário', () => {
      const serviceOrder = create();
      const serviceItem = serviceOrder.addService(oilChange(), 1);
      const productItem = serviceOrder.addProduct(brakePad(), 1);

      serviceOrder.changeItemQuantity(serviceItem.idValue, 2);
      serviceOrder.changeItemQuantity(productItem.idValue, 10);

      expect(serviceItem.quantityValue).toBe(2);
      expect(serviceItem.unitPriceValue.value).toBe(89.9);
      expect(productItem.quantityValue).toBe(10);
      expect(serviceOrder.total.value).toBe(180.8);
    });

    it('recusa quantidade inválida e item inexistente', () => {
      const serviceOrder = create();
      const item = serviceOrder.addService(oilChange(), 1);

      expect(() => serviceOrder.changeItemQuantity(item.idValue, 0)).toThrow(
        codeOf(ServiceOrderErrorCode.INVALID_QUANTITY),
      );
      expect(() => serviceOrder.changeItemQuantity('nope', 1)).toThrow(
        codeOf(ServiceOrderErrorCode.ITEM_NOT_FOUND),
      );
    });

    it('recusa depois do orçamento gerado', () => {
      const serviceOrder = awaitingApproval();
      const itemId = serviceOrder.servicesValue[0]?.idValue ?? '';
      expect(() => serviceOrder.changeItemQuantity(itemId, 2)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_IN_DIAGNOSIS),
      );
    });
  });

  describe('removeItem', () => {
    it('remove serviço ou produto', () => {
      const serviceOrder = create();
      const serviceItem = serviceOrder.addService(oilChange(), 1);
      const productItem = serviceOrder.addProduct(brakePad(), 1);

      serviceOrder.removeItem(serviceItem.idValue);
      serviceOrder.removeItem(productItem.idValue);

      expect(serviceOrder.servicesValue).toHaveLength(0);
      expect(serviceOrder.productsValue).toHaveLength(0);
    });

    it('recusa item inexistente', () => {
      expect(() => create().removeItem('nope')).toThrow(
        codeOf(ServiceOrderErrorCode.ITEM_NOT_FOUND),
      );
    });

    it('recusa depois do orçamento gerado', () => {
      const serviceOrder = awaitingApproval();
      const itemId = serviceOrder.servicesValue[0]?.idValue ?? '';
      expect(() => serviceOrder.removeItem(itemId)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_IN_DIAGNOSIS),
      );
    });
  });

  describe('completeDiagnosis', () => {
    it('gera o orçamento: Aguardando aprovação + linha nova no histórico', () => {
      const serviceOrder = awaitingApproval();

      expect(serviceOrder.statusValue).toBe(
        ServiceOrderStatus.AWAITING_APPROVAL,
      );
      expect(serviceOrder.historyValue).toHaveLength(2);
      expect(serviceOrder.historyValue[1]?.statusValue).toBe(
        ServiceOrderStatus.AWAITING_APPROVAL,
      );
      expect(serviceOrder.historyValue[1]?.changedByIdValue).toBe(MECHANIC.id);
      expect(serviceOrder.total.value).toBe(89.9);
    });

    it('exige mecânico atribuído', () => {
      const serviceOrder = create();
      serviceOrder.addService(oilChange(), 1);
      expect(() => serviceOrder.completeDiagnosis('admin-1')).toThrow(
        codeOf(ServiceOrderErrorCode.NO_ASSIGNEE),
      );
    });

    it('exige ao menos um item', () => {
      const serviceOrder = create();
      serviceOrder.assign(MECHANIC);
      expect(() => serviceOrder.completeDiagnosis(MECHANIC.id)).toThrow(
        codeOf(ServiceOrderErrorCode.EMPTY_QUOTE),
      );
    });

    it('não conclui duas vezes', () => {
      expect(() => awaitingApproval().completeDiagnosis(MECHANIC.id)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_IN_DIAGNOSIS),
      );
    });
  });

  describe('approve', () => {
    it('congela o total como valor aprovado e vai para Em execução', () => {
      const serviceOrder = awaitingApproval();

      serviceOrder.approve(null);

      expect(serviceOrder.statusValue).toBe(ServiceOrderStatus.IN_EXECUTION);
      expect(serviceOrder.approvedAmountValue?.value).toBe(89.9);
      expect(serviceOrder.approvedAtValue).toBeInstanceOf(Date);
      expect(serviceOrder.historyValue.at(-1)?.statusValue).toBe(
        ServiceOrderStatus.IN_EXECUTION,
      );
      expect(serviceOrder.historyValue.at(-1)?.changedByIdValue).toBeNull();
    });

    it('grava quem registrou a decisão no histórico', () => {
      const serviceOrder = awaitingApproval();
      serviceOrder.approve('admin-1');
      expect(serviceOrder.historyValue.at(-1)?.changedByIdValue).toBe(
        'admin-1',
      );
    });

    it.each([
      ServiceOrderStatus.IN_DIAGNOSIS,
      ServiceOrderStatus.IN_EXECUTION,
      ServiceOrderStatus.REJECTED,
      ServiceOrderStatus.FINISHED,
    ])('recusa aprovar OS em %s', (status) => {
      expect(() => restoreWithStatus(status).approve(null)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_AWAITING_APPROVAL),
      );
    });
  });

  describe('finish', () => {
    it('finaliza a OS em execução, com quem finalizou no histórico', () => {
      const serviceOrder = awaitingApproval();
      serviceOrder.approve(null);

      serviceOrder.finish(MECHANIC.id);

      expect(serviceOrder.statusValue).toBe(ServiceOrderStatus.FINISHED);
      expect(serviceOrder.isClosed).toBeTrue();
      expect(serviceOrder.historyValue.at(-1)?.statusValue).toBe(
        ServiceOrderStatus.FINISHED,
      );
      expect(serviceOrder.historyValue.at(-1)?.changedByIdValue).toBe(
        MECHANIC.id,
      );
    });

    it.each([
      ServiceOrderStatus.IN_DIAGNOSIS,
      ServiceOrderStatus.AWAITING_APPROVAL,
      ServiceOrderStatus.FINISHED,
      ServiceOrderStatus.REJECTED,
    ])('recusa finalizar OS em %s', (status) => {
      expect(() => restoreWithStatus(status).finish(MECHANIC.id)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_IN_EXECUTION),
      );
    });
  });

  describe('loadedStatus (lock otimista)', () => {
    it('OS nova não foi lida do banco; a restaurada guarda o status lido', () => {
      expect(create().loadedStatusValue).toBeNull();
      const restored = restoreWithStatus(ServiceOrderStatus.IN_EXECUTION);
      restored.finish(MECHANIC.id);
      expect(restored.loadedStatusValue).toBe(ServiceOrderStatus.IN_EXECUTION);
    });
  });

  describe('reject', () => {
    it('encerra a OS como Rejeitada, sem valor aprovado', () => {
      const serviceOrder = awaitingApproval();

      serviceOrder.reject(null);

      expect(serviceOrder.statusValue).toBe(ServiceOrderStatus.REJECTED);
      expect(serviceOrder.isClosed).toBeTrue();
      expect(serviceOrder.approvedAmountValue).toBeNull();
      expect(serviceOrder.historyValue.at(-1)?.statusValue).toBe(
        ServiceOrderStatus.REJECTED,
      );
    });

    it('recusa rejeitar o que já foi decidido', () => {
      const serviceOrder = awaitingApproval();
      serviceOrder.approve(null);
      expect(() => serviceOrder.reject(null)).toThrow(
        codeOf(ServiceOrderErrorCode.NOT_AWAITING_APPROVAL),
      );
    });
  });
});
