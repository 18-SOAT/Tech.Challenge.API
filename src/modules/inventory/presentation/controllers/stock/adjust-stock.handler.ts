import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { AdjustStockUseCase } from '../../../application/use-cases/adjust-stock.use-case.js';
import {
  ProductResponseDto,
  ProductResponseSchema,
} from '../../dtos/product.response.dto.js';
import { ProductIdParamsSchema } from '../../dtos/product-id.dto.js';
import { StockAdjustmentRequestSchema } from '../../dtos/stock-adjustment.dto.js';

export const adjustStockHandler = (adjustStock: AdjustStockUseCase) =>
  new Elysia().post(
    '/:id/stock/adjustments',
    async ({ params, body }) =>
      ok(
        ProductResponseDto.fromEntity(
          await adjustStock.execute({ productId: params.id, ...body }),
        ),
        201,
      ),
    {
      params: ProductIdParamsSchema,
      body: StockAdjustmentRequestSchema,
      response: {
        201: Envelope(ProductResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Ajusta o estoque (inventário)',
        description:
          'Gera uma movimentação ADJUSTMENT com o delta com sinal e o motivo, na mesma transação do saldo. 400: delta 0 ou sem motivo. 404: produto não encontrado. 409: o saldo ficaria negativo.',
      },
    },
  );
