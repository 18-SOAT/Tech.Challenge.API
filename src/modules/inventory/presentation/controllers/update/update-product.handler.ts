import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { UpdateProductUseCase } from '../../../application/use-cases/update-product.use-case.js';
import {
  ProductResponseDto,
  ProductResponseSchema,
} from '../../dtos/product.response.dto.js';
import { ProductIdParamsSchema } from '../../dtos/product-id.dto.js';
import { UpdateProductRequestSchema } from '../../dtos/update-product.dto.js';

export const updateProductHandler = (updateProduct: UpdateProductUseCase) =>
  new Elysia().patch(
    '/:id',
    async ({ params, body }) =>
      ok(
        ProductResponseDto.fromEntity(
          await updateProduct.execute({ id: params.id, ...body }),
        ),
      ),
    {
      params: ProductIdParamsSchema,
      body: UpdateProductRequestSchema,
      response: {
        200: Envelope(ProductResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Altera, desativa ou reativa um produto',
        description:
          'Só os campos enviados mudam; null remove a descrição. O saldo não é alterável aqui: use entrada ou ajuste de estoque. 400: dados inválidos. 404: produto não encontrado. 409: SKU de outro produto.',
      },
    },
  );
