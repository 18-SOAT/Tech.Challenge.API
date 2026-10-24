import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListOrdersUseCase } from '../../../application/use-cases/list-orders.use-case.js';
import {
  ListOrdersRequestSchema,
  OrderPageSchema,
} from '../../dtos/list-orders.dto.js';
import { OrderResponseDto } from '../../dtos/order.response.dto.js';
import { toDate } from '../../dtos/query-fields.js';

export const listOrdersHandler = (listOrders: ListOrdersUseCase) =>
  new Elysia().route(
    'QUERY',
    '/',
    async ({ body }) =>
      ok(
        pageResponse(
          await listOrders.execute({
            ...body,
            receivedFrom: toDate(body.receivedFrom),
            receivedTo: toDate(body.receivedTo),
          }),
          body,
          OrderResponseDto.fromEntity,
        ),
      ),
    {
      body: ListOrdersRequestSchema,
      response: {
        200: Envelope(OrderPageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Lista as Ordens (método QUERY)',
        description:
          'Filtros por status, cliente, veículo e período de chegada; das mais recentes para as mais antigas. 400: filtro ou paginação inválidos.',
      },
    },
  );
