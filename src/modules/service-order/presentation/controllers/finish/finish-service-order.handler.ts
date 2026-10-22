import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { FinishServiceOrderUseCase } from '../../../application/use-cases/finish-service-order.use-case.js';
import { toActor } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

export const finishServiceOrderHandler = (
  finishServiceOrder: FinishServiceOrderUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/:id/finish',
    async ({ params, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await finishServiceOrder.execute({
            serviceOrderId: params.id,
            actor: toActor(user),
          }),
        ),
      ),
    {
      auth: true,
      params: ServiceOrderIdParamsSchema,
      response: {
        200: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Finaliza a OS',
        description:
          'A OS em execução vai para FINISHED; o histórico fecha o tempo de execução. Pelo mecânico responsável ou por um ADMIN. 403: OS de outro mecânico. 404: OS não encontrada. 409: OS fora de execução, ou alterada por outra operação ao mesmo tempo.',
      },
    },
  );
