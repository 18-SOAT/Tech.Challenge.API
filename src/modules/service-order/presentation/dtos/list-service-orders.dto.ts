import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { dateTimeFilter, uuidFilter } from './query-fields.js';
import { ServiceOrderResponseSchema } from './service-order.response.dto.js';

const assigneeIdFilter = uuidFilter(
  'Mecânico responsável. Ignorado para o MECHANIC, que só vê as OS dele',
  'Id de mecânico inválido.',
);

// Body do QUERY /service-orders.
export const ListServiceOrdersRequestSchema = t.Object(
  {
    ...PaginationFields,
    status: t.Optional(
      t.Enum(ServiceOrderStatus, { error: 'Status de OS inválido.' }),
    ),
    assigneeId: assigneeIdFilter,
    customerId: uuidFilter('Cliente da Ordem', 'Id de cliente inválido.'),
    createdFrom: dateTimeFilter('OS criadas a partir de'),
    createdTo: dateTimeFilter('OS criadas até'),
  },
  { additionalProperties: false },
);

// Body do QUERY /service-orders/queue.
export const ServiceOrderQueueRequestSchema = t.Object(
  { ...PaginationFields, assigneeId: assigneeIdFilter },
  { additionalProperties: false },
);

export const ServiceOrderPageSchema = PageSchema(
  ServiceOrderResponseSchema,
  'ServiceOrderPage',
);
