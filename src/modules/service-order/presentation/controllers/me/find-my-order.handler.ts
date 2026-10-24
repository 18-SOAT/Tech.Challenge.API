import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { FindMyOrderUseCase } from '../../../application/use-cases/find-my-order.use-case.js';
import { toCustomerId } from '../../actor.js';
import {
  MyOrderResponseSchema,
  toMyOrderResponse,
} from '../../dtos/my-order.response.dto.js';
import { OrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

export const findMyOrderHandler = (
  findMyOrder: FindMyOrderUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).get(
    '/orders/:id',
    async ({ params, user }) =>
      ok(
        toMyOrderResponse(
          await findMyOrder.execute({
            customerId: toCustomerId(user),
            orderId: params.id,
          }),
        ),
      ),
    {
      auth: true,
      params: OrderIdParamsSchema,
      response: {
        200: Envelope(MyOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: {
        summary: 'Acompanha uma ordem',
        description:
          'Andamento da Ordem: status do enunciado, cada OS com itens, orçamento, valor aprovado e histórico. Só para CUSTOMER (403 para funcionário). 404: ordem inexistente ou de outro cliente.',
      },
    },
  );
