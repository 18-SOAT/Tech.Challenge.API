import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { OpenAdditionalServiceOrderUseCase } from '../../../application/use-cases/open-additional-service-order.use-case.js';
import { toActor } from '../../actor.js';
import { OpenAdditionalServiceOrderRequestSchema } from '../../dtos/open-order.dto.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { OrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

export const openAdditionalServiceOrderHandler = (
  openAdditional: OpenAdditionalServiceOrderUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/:id/service-orders',
    async ({ params, body, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await openAdditional.execute({
            orderId: params.id,
            description: body.description,
            openedById: toActor(user).employeeId,
          }),
        ),
        201,
      ),
    {
      auth: true,
      params: OrderIdParamsSchema,
      body: OpenAdditionalServiceOrderRequestSchema,
      response: {
        201: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Abre um reparo adicional na ordem',
        description:
          'Problema achado durante a estadia: nova OS (IN_DIAGNOSIS) na mesma Ordem, com orçamento próprio, sem alterar as OS já aprovadas. 404: ordem não encontrada. 409: ordem já entregue.',
      },
    },
  );
