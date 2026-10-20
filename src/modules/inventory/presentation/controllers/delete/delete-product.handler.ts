import { Elysia, t } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { DeleteProductUseCase } from '../../../application/use-cases/delete-product.use-case.js';
import { ProductIdParamsSchema } from '../../dtos/product-id.dto.js';

// 200 com `data: null` (e não 204): mantém o envelope em toda resposta da API.
export const deleteProductHandler = (deleteProduct: DeleteProductUseCase) =>
  new Elysia().delete(
    '/:id',
    async ({ params }) => {
      await deleteProduct.execute(params.id);
      return ok(null);
    },
    {
      params: ProductIdParamsSchema,
      response: {
        200: Envelope(t.Null()),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Exclui um produto sem histórico',
        description:
          '404: produto não encontrado. 409: produto com movimentação de estoque ou usado em OS — desative com PATCH { active: false }.',
      },
    },
  );
