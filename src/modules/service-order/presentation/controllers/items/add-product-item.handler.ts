import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { AddProductItemUseCase } from '../../../application/use-cases/add-product-item.use-case.js';
import { toActor } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';
import { AddProductItemRequestSchema } from '../../dtos/service-order-item.dto.js';

export const addProductItemHandler = (
  addProductItem: AddProductItemUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/:id/products',
    async ({ params, body, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await addProductItem.execute({
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
      body: AddProductItemRequestSchema,
      response: {
        201: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Inclui uma peça/insumo na OS',
        description:
          'Copia o preço do catálogo (snapshot). O estoque não é reservado: a baixa acontece na aprovação do orçamento. Só em diagnóstico, pelo mecânico responsável ou ADMIN. 403: OS de outro mecânico. 404: OS ou produto não encontrado. 409: OS fora do diagnóstico ou produto inativo.',
      },
    },
  );
