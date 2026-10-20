import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListStockMovementsUseCase } from '../../../application/use-cases/list-stock-movements.use-case.js';
import {
  ListStockMovementsRequestSchema,
  StockMovementPageSchema,
} from '../../dtos/list-stock-movements.dto.js';
import { ProductIdParamsSchema } from '../../dtos/product-id.dto.js';
import { StockMovementResponseDto } from '../../dtos/stock-movement.response.dto.js';

export const listStockMovementsHandler = (
  listStockMovements: ListStockMovementsUseCase,
) =>
  new Elysia().route(
    'QUERY',
    '/:id/stock-movements',
    async ({ params, body }) =>
      ok(
        pageResponse(
          await listStockMovements.execute({ productId: params.id, ...body }),
          body,
          StockMovementResponseDto.fromEntity,
        ),
      ),
    {
      params: ProductIdParamsSchema,
      body: ListStockMovementsRequestSchema,
      response: {
        200: Envelope(StockMovementPageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: {
        summary: 'Extrato de estoque do produto (método QUERY)',
        description:
          'Movimentações do livro-razão, da mais recente para a mais antiga. 404: produto não encontrado.',
      },
    },
  );
