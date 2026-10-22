import { Elysia, t } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { ListMyOrdersUseCase } from '../../../application/use-cases/list-my-orders.use-case.js';
import { toCustomerId } from '../../actor.js';
import {
  MyOrderResponseSchema,
  toMyOrderResponse,
} from '../../dtos/my-order.response.dto.js';

export const listMyOrdersHandler = (
  listMyOrders: ListMyOrdersUseCase,
  auth: AuthPlugin,
) =>
  new Elysia()
    .use(auth)
    .get(
      '/orders',
      async ({ user }) =>
        ok(
          (await listMyOrders.execute({ customerId: toCustomerId(user) })).map(
            toMyOrderResponse,
          ),
        ),
      {
        auth: true,
        response: {
          200: Envelope(t.Array(MyOrderResponseSchema)),
          401: ApiError,
          403: ApiError,
        },
        detail: {
          summary: 'Lista as minhas ordens',
          description:
            'Ordens do cliente do token, mais recentes primeiro, com o status do enunciado da Ordem e de cada OS. Só para CUSTOMER (403 para funcionário).',
        },
      },
    );
