import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../../shared/presentation/http/envelope.js';
import type { FindProductByIdUseCase } from '../../../../application/use-cases/find-product-by-id.use-case.js';
import {
  ProductResponseDto,
  ProductResponseSchema,
} from '../../../dtos/product.response.dto.js';
import { ProductIdParamsSchema } from '../../../dtos/product-id.dto.js';

export const findProductByIdHandler = (
  findProductById: FindProductByIdUseCase,
) =>
  new Elysia().get(
    '/:id',
    async ({ params }) =>
      ok(
        ProductResponseDto.fromEntity(await findProductById.execute(params.id)),
      ),
    {
      params: ProductIdParamsSchema,
      response: {
        200: Envelope(ProductResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: { summary: 'Detalha um produto, com o saldo atual' },
    },
  );
