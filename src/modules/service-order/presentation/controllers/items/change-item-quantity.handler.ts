import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { ChangeItemQuantityUseCase } from '../../../application/use-cases/change-item-quantity.use-case.js';
import { toActor } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderItemParamsSchema } from '../../dtos/service-order-id.dto.js';
import { ChangeItemQuantityRequestSchema } from '../../dtos/service-order-item.dto.js';

export const changeItemQuantityHandler = (
  changeItemQuantity: ChangeItemQuantityUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).patch(
    '/:id/items/:itemId',
    async ({ params, body, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await changeItemQuantity.execute({
            serviceOrderId: params.id,
            itemId: params.itemId,
            quantity: body.quantity,
            actor: toActor(user),
          }),
        ),
      ),
    {
      auth: true,
      params: ServiceOrderItemParamsSchema,
      body: ChangeItemQuantityRequestSchema,
      response: {
        200: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Altera a quantidade de um item da OS',
        description:
          'Serviço ou produto; o preço unitário continua o do momento da inclusão. 403: OS de outro mecânico. 404: OS ou item não encontrado. 409: OS fora do diagnóstico.',
      },
    },
  );
