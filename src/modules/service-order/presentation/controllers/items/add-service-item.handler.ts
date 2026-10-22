import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { AddServiceItemUseCase } from '../../../application/use-cases/add-service-item.use-case.js';
import { toActor } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';
import { AddServiceItemRequestSchema } from '../../dtos/service-order-item.dto.js';

export const addServiceItemHandler = (
  addServiceItem: AddServiceItemUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/:id/services',
    async ({ params, body, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await addServiceItem.execute({
            serviceOrderId: params.id,
            ...body,
            actor: toActor(user),
          }),
        ),
        201,
      ),
    {
      auth: true,
      params: ServiceOrderIdParamsSchema,
      body: AddServiceItemRequestSchema,
      response: {
        201: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Inclui um serviço na OS',
        description:
          'Copia o preço do catálogo (snapshot); o mesmo serviço de novo soma na quantidade. Só em diagnóstico, pelo mecânico responsável ou ADMIN. 403: OS de outro mecânico. 404: OS ou serviço não encontrado. 409: OS fora do diagnóstico ou serviço inativo.',
      },
    },
  );
