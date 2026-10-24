import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListServiceOrdersUseCase } from '../../../application/use-cases/list-service-orders.use-case.js';
import { toActor } from '../../actor.js';
import {
  ListServiceOrdersRequestSchema,
  ServiceOrderPageSchema,
} from '../../dtos/list-service-orders.dto.js';
import { toDate } from '../../dtos/query-fields.js';
import { ServiceOrderResponseDto } from '../../dtos/service-order.response.dto.js';

// QUERY: seguro e idempotente como o GET, com filtros no corpo (ver list-customers).
export const listServiceOrdersHandler = (
  listServiceOrders: ListServiceOrdersUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).route(
    'QUERY',
    '/',
    async ({ body, user }) =>
      ok(
        pageResponse(
          await listServiceOrders.execute({
            ...body,
            createdFrom: toDate(body.createdFrom),
            createdTo: toDate(body.createdTo),
            actor: toActor(user),
          }),
          body,
          ServiceOrderResponseDto.fromEntity,
        ),
      ),
    {
      auth: true,
      body: ListServiceOrdersRequestSchema,
      response: {
        200: Envelope(ServiceOrderPageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Lista as OS (método QUERY)',
        description:
          'Filtros por status, mecânico, cliente e período de criação; das mais novas para as mais antigas. O MECHANIC só recebe as OS atribuídas a ele. 400: filtro ou paginação inválidos.',
      },
    },
  );
