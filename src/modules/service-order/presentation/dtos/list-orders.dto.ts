import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { OrderResponseSchema } from './order.response.dto.js';
import { dateTimeFilter, uuidFilter } from './query-fields.js';

// Body do QUERY /orders.
export const ListOrdersRequestSchema = t.Object(
  {
    ...PaginationFields,
    status: t.Optional(
      t.Enum(OrderStatus, { error: 'Status de ordem inválido.' }),
    ),
    customerId: uuidFilter('Cliente da Ordem', 'Id de cliente inválido.'),
    vehicleId: uuidFilter('Veículo da Ordem', 'Id de veículo inválido.'),
    receivedFrom: dateTimeFilter('Veículos que chegaram a partir de'),
    receivedTo: dateTimeFilter('Veículos que chegaram até'),
  },
  { additionalProperties: false },
);

export const OrderPageSchema = PageSchema(OrderResponseSchema, 'OrderPage');
