import { t } from 'elysia';
import type { Order } from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from './service-order.response.dto.js';

export class OrderResponseDto {
  private constructor(
    readonly id: string,
    readonly number: number | null,
    readonly customerId: string,
    readonly vehicleId: string,
    readonly status: OrderStatus,
    readonly notes: string | null,
    readonly receivedAt: string,
    readonly deliveredAt: string | null,
  ) {}

  static fromEntity(order: Order): OrderResponseDto {
    return new OrderResponseDto(
      order.idValue,
      order.numberValue,
      order.customerIdValue,
      order.vehicleIdValue,
      order.statusValue,
      order.notesValue,
      order.receivedAtValue.toISOString(),
      order.deliveredAtValue?.toISOString() ?? null,
    );
  }
}

export const OrderResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid', description: 'Id da Ordem (UUID v7)' }),
    number: t.Nullable(
      t.Integer({ description: 'Número legível da ordem', examples: [42] }),
    ),
    customerId: t.String({ format: 'uuid' }),
    vehicleId: t.String({ format: 'uuid' }),
    status: t.Enum(OrderStatus),
    notes: t.Nullable(t.String()),
    receivedAt: t.String({ format: 'date-time' }),
    deliveredAt: t.Nullable(t.String({ format: 'date-time' })),
  },
  { title: 'Order' },
);

// Resposta da abertura: a Ordem e a primeira OS, criadas na mesma transação.
export const openOrderResponse = (
  order: Order,
  serviceOrder: ServiceOrder,
) => ({
  order: OrderResponseDto.fromEntity(order),
  serviceOrder: ServiceOrderResponseDto.fromEntity(serviceOrder),
});

export const OpenOrderResponseSchema = t.Object(
  { order: OrderResponseSchema, serviceOrder: ServiceOrderResponseSchema },
  { title: 'OpenedOrder' },
);
