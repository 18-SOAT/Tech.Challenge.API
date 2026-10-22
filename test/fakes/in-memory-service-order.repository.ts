import { ProductItem } from '../../src/modules/service-order/domain/entities/product-item.entity.js';
import { ServiceItem } from '../../src/modules/service-order/domain/entities/service-item.entity.js';
import { ServiceOrder } from '../../src/modules/service-order/domain/entities/service-order.entity.js';
import { ServiceOrderStatusHistory } from '../../src/modules/service-order/domain/entities/service-order-status-history.entity.js';
import { ServiceOrderError } from '../../src/modules/service-order/domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../src/modules/service-order/domain/repositories/service-order.repository.js';

// Cópia do agregado, como um SELECT faria (mesma ideia do cloneProduct): sem isso,
// uma transição feita em memória por um use case que depois falha (ex: aprovação
// com saldo insuficiente) vazaria para cá e o fake esconderia o rollback.
export const cloneServiceOrder = (serviceOrder: ServiceOrder): ServiceOrder =>
  ServiceOrder.restore({
    id: serviceOrder.idValue,
    orderId: serviceOrder.orderIdValue,
    assigneeId: serviceOrder.assigneeIdValue,
    status: serviceOrder.statusValue,
    description: serviceOrder.descriptionValue,
    approvedAmount: serviceOrder.approvedAmountValue?.value ?? null,
    approvedAt: serviceOrder.approvedAtValue,
    createdAt: serviceOrder.createdAtValue,
    services: serviceOrder.servicesValue.map((item) =>
      ServiceItem.restore({
        id: item.idValue,
        serviceId: item.serviceIdValue,
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue.value,
      }),
    ),
    products: serviceOrder.productsValue.map((item) =>
      ProductItem.restore({
        id: item.idValue,
        productId: item.productIdValue,
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue.value,
      }),
    ),
    history: serviceOrder.historyValue.map((row) =>
      ServiceOrderStatusHistory.restore({
        id: row.idValue,
        status: row.statusValue,
        changedById: row.changedByIdValue,
        changedAt: row.changedAtValue,
      }),
    ),
  });

export class InMemoryServiceOrderRepository implements ServiceOrderRepository {
  readonly items: ServiceOrder[] = [];

  async create(serviceOrder: ServiceOrder): Promise<void> {
    this.items.push(cloneServiceOrder(serviceOrder));
  }

  async findById(id: string): Promise<ServiceOrder | null> {
    const stored = this.items.find((item) => item.idValue === id);
    return stored ? cloneServiceOrder(stored) : null;
  }

  async save(serviceOrder: ServiceOrder): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.idValue === serviceOrder.idValue,
    );
    if (index < 0) throw ServiceOrderError.notFound();
    this.items[index] = cloneServiceOrder(serviceOrder);
  }
}
