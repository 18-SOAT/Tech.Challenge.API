import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../../shared/presentation/http/envelope.js';
import type { FindServiceOrderByIdUseCase } from '../../../../application/use-cases/find-service-order-by-id.use-case.js';
import { toActor } from '../../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../../dtos/service-order-id.dto.js';

export const findServiceOrderByIdHandler = (
  findServiceOrderById: FindServiceOrderByIdUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).get(
    '/:id',
    async ({ params, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await findServiceOrderById.execute({
            id: params.id,
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
      },
      detail: {
        summary: 'Detalha uma OS',
        description:
          'Itens com preço congelado, total do orçamento e histórico de status. O MECHANIC só vê as OS atribuídas a ele. 403: OS de outro mecânico. 404: OS não encontrada.',
      },
    },
  );
