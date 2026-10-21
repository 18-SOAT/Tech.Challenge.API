import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { RemoveItemUseCase } from '../../../application/use-cases/remove-item.use-case.js';
import { toActor } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderItemParamsSchema } from '../../dtos/service-order-id.dto.js';

// Devolve a OS atualizada (e não 204): quem removeu já vê o orçamento recalculado.
export const removeItemHandler = (
  removeItem: RemoveItemUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).delete(
    '/:id/items/:itemId',
    async ({ params, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await removeItem.execute({
            serviceOrderId: params.id,
            itemId: params.itemId,
            actor: toActor(user),
          }),
        ),
      ),
    {
      auth: true,
      params: ServiceOrderItemParamsSchema,
      response: {
        200: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Remove um item da OS',
        description:
          'Serviço ou produto incluído por engano. 403: OS de outro mecânico. 404: OS ou item não encontrado. 409: OS fora do diagnóstico.',
      },
    },
  );
