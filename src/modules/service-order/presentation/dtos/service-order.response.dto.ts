import { t } from 'elysia';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';

interface ItemDto {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export class ServiceOrderResponseDto {
  private constructor(
    readonly id: string,
    readonly orderId: string,
    readonly status: ServiceOrderStatus,
    readonly description: string | null,
    readonly assigneeId: string | null,
    readonly total: number,
    readonly approvedAmount: number | null,
    readonly approvedAt: string | null,
    readonly createdAt: string,
    readonly services: (ItemDto & { serviceId: string })[],
    readonly products: (ItemDto & { productId: string })[],
    readonly history: {
      status: ServiceOrderStatus;
      changedById: string | null;
      changedAt: string;
    }[],
  ) {}

  static fromEntity(serviceOrder: ServiceOrder): ServiceOrderResponseDto {
    return new ServiceOrderResponseDto(
      serviceOrder.idValue,
      serviceOrder.orderIdValue,
      serviceOrder.statusValue,
      serviceOrder.descriptionValue,
      serviceOrder.assigneeIdValue,
      serviceOrder.total.value,
      serviceOrder.approvedAmountValue?.value ?? null,
      serviceOrder.approvedAtValue?.toISOString() ?? null,
      serviceOrder.createdAtValue.toISOString(),
      serviceOrder.servicesValue.map((item) => ({
        id: item.idValue,
        serviceId: item.serviceIdValue,
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue.value,
        subtotal: item.subtotal.value,
      })),
      serviceOrder.productsValue.map((item) => ({
        id: item.idValue,
        productId: item.productIdValue,
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue.value,
        subtotal: item.subtotal.value,
      })),
      serviceOrder.historyValue.map((row) => ({
        status: row.statusValue,
        changedById: row.changedByIdValue,
        changedAt: row.changedAtValue.toISOString(),
      })),
    );
  }
}

const itemFields = {
  id: t.String({ format: 'uuid', description: 'Id do item na OS' }),
  quantity: t.Integer({ examples: [1] }),
  unitPrice: t.Number({
    description: 'Preço unitário congelado quando o item entrou (snapshot)',
    examples: [89.9],
  }),
  subtotal: t.Number({ examples: [89.9] }),
};

export const ServiceOrderResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid', description: 'Id da OS (UUID v7)' }),
    orderId: t.String({ format: 'uuid', description: 'Ordem (estadia) da OS' }),
    status: t.Enum(ServiceOrderStatus),
    description: t.Nullable(t.String()),
    assigneeId: t.Nullable(
      t.String({ format: 'uuid', description: 'Mecânico responsável' }),
    ),
    total: t.Number({
      description: 'Orçamento: soma dos subtotais',
      examples: [160.9],
    }),
    approvedAmount: t.Nullable(
      t.Number({ description: 'Valor congelado na aprovação' }),
    ),
    approvedAt: t.Nullable(t.String({ format: 'date-time' })),
    createdAt: t.String({ format: 'date-time' }),
    services: t.Array(
      t.Object({ ...itemFields, serviceId: t.String({ format: 'uuid' }) }),
    ),
    products: t.Array(
      t.Object({ ...itemFields, productId: t.String({ format: 'uuid' }) }),
    ),
    history: t.Array(
      t.Object({
        status: t.Enum(ServiceOrderStatus),
        changedById: t.Nullable(
          t.String({
            format: 'uuid',
            description: 'Funcionário; null = cliente ou sistema',
          }),
        ),
        changedAt: t.String({ format: 'date-time' }),
      }),
    ),
  },
  { title: 'ServiceOrder' },
);
