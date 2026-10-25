import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../../shared/presentation/http/envelope.js';
import type { FindOrderByIdUseCase } from '../../../../application/use-cases/find-order-by-id.use-case.js';
import {
  OrderDetailResponseSchema,
  toOrderDetailResponse,
} from '../../../dtos/order-detail.response.dto.js';
import { OrderIdParamsSchema } from '../../../dtos/service-order-id.dto.js';

export const findOrderByIdHandler = (findOrderById: FindOrderByIdUseCase) =>
  new Elysia().get(
    '/:id',
    async ({ params }) =>
      ok(toOrderDetailResponse(await findOrderById.execute({ id: params.id }))),
    {
      params: OrderIdParamsSchema,
      response: {
        200: Envelope(OrderDetailResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: {
        summary: 'Detalha uma Ordem',
        description:
          'A estadia com todas as OS (itens, histórico), o andamento e os totais orçado e aprovado. 404: ordem não encontrada.',
      },
    },
  );
