import type { Prisma } from '../../../../generated/prisma/client.js';
import { ProductItem } from '../../domain/entities/product-item.entity.js';
import { ServiceItem } from '../../domain/entities/service-item.entity.js';
import { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderStatusHistory } from '../../domain/entities/service-order-status-history.entity.js';
import type { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';

// Toda leitura de ServiceOrder traz o agregado inteiro: itens e histórico em ordem.
export const withAggregate = {
  services: { orderBy: { id: 'asc' } },
  products: { orderBy: { id: 'asc' } },
  statusHistory: { orderBy: [{ changedAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.ServiceOrderInclude;

type ServiceOrderRecord = Prisma.ServiceOrderGetPayload<{
  include: typeof withAggregate;
}>;

// Decimal(10,2) → number: o Money.fromReais do restore absorve o ruído do float.
export class ServiceOrderMapper {
  static toEntity(record: ServiceOrderRecord): ServiceOrder {
    return ServiceOrder.restore({
      id: record.id,
      orderId: record.orderId,
      assigneeId: record.assigneeId,
      status: record.status as ServiceOrderStatus,
      description: record.description,
      approvedAmount: record.approvedAmount?.toNumber() ?? null,
      approvedAt: record.approvedAt,
      createdAt: record.createdAt,
      services: record.services.map((item) =>
        ServiceItem.restore({
          id: item.id,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
        }),
      ),
      products: record.products.map((item) =>
        ProductItem.restore({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
        }),
      ),
      history: record.statusHistory.map((row) =>
        ServiceOrderStatusHistory.restore({
          id: row.id,
          status: row.status as ServiceOrderStatus,
          changedById: row.changedById,
          changedAt: row.changedAt,
        }),
      ),
    });
  }

  // Linha de `service_orders`, sem itens nem histórico (ver toChildren).
  static toObject(entity: ServiceOrder) {
    return {
      id: entity.idValue,
      orderId: entity.orderIdValue,
      assigneeId: entity.assigneeIdValue,
      status: entity.statusValue,
      description: entity.descriptionValue,
      approvedAmount: entity.approvedAmountValue?.toDecimalString() ?? null,
      approvedAt: entity.approvedAtValue,
      createdAt: entity.createdAtValue,
    } satisfies Prisma.ServiceOrderUncheckedCreateInput;
  }

  static toServiceItems(
    entity: ServiceOrder,
  ): Prisma.ServiceItemCreateManyInput[] {
    return entity.servicesValue.map((item) => ({
      id: item.idValue,
      serviceOrderId: entity.idValue,
      serviceId: item.serviceIdValue,
      quantity: item.quantityValue,
      unitPrice: item.unitPriceValue.toDecimalString(),
    }));
  }

  static toProductItems(
    entity: ServiceOrder,
  ): Prisma.ProductItemCreateManyInput[] {
    return entity.productsValue.map((item) => ({
      id: item.idValue,
      serviceOrderId: entity.idValue,
      productId: item.productIdValue,
      quantity: item.quantityValue,
      unitPrice: item.unitPriceValue.toDecimalString(),
    }));
  }

  static toHistory(
    entity: ServiceOrder,
  ): Prisma.ServiceOrderStatusHistoryCreateManyInput[] {
    return entity.historyValue.map((row) => ({
      id: row.idValue,
      serviceOrderId: entity.idValue,
      status: row.statusValue,
      changedById: row.changedByIdValue,
      changedAt: row.changedAtValue,
    }));
  }
}
