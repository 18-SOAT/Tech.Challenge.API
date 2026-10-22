import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { DeliverOrderUseCase } from '../../../application/use-cases/deliver-order.use-case.js';
import {
  OrderResponseDto,
  OrderResponseSchema,
} from '../../dtos/order.response.dto.js';
import { OrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

export const deliverOrderHandler = (deliverOrder: DeliverOrderUseCase) =>
  new Elysia().post(
    '/:id/deliver',
    async ({ params }) =>
      ok(
        OrderResponseDto.fromEntity(
          await deliverOrder.execute({ orderId: params.id }),
        ),
      ),
    {
      params: OrderIdParamsSchema,
      response: {
        200: Envelope(OrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Entrega o veículo',
        description:
          'A Ordem vai para DELIVERED. Só com todas as OS finalizadas ou rejeitadas (se o cliente rejeitou tudo, a Ordem vai de RECEIVED direto para DELIVERED). 404: Ordem não encontrada. 409: OS ainda abertas ou Ordem já entregue.',
      },
    },
  );
