import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { AssignMechanicUseCase } from '../../../application/use-cases/assign-mechanic.use-case.js';
import { AssignMechanicRequestSchema } from '../../dtos/assign-mechanic.dto.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

// Sub-recurso `/assignee`: atribuir é um comando com regra própria (só MECHANIC).
export const assignMechanicHandler = (assignMechanic: AssignMechanicUseCase) =>
  new Elysia().patch(
    '/:id/assignee',
    async ({ params, body }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await assignMechanic.execute({
            serviceOrderId: params.id,
            mechanicId: body.mechanicId,
          }),
        ),
      ),
    {
      params: ServiceOrderIdParamsSchema,
      body: AssignMechanicRequestSchema,
      response: {
        200: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
        422: ApiError,
      },
      detail: {
        summary: 'Atribui o mecânico responsável pela OS',
        description:
          'Pode trocar o responsável enquanto a OS não foi finalizada nem rejeitada. 404: OS ou funcionário não encontrado. 409: OS fechada. 422: o funcionário não é MECHANIC.',
      },
    },
  );
