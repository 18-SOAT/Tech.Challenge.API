import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { ReceiveStockUseCase } from '../../../application/use-cases/receive-stock.use-case.js';
import {
  ProductResponseDto,
  ProductResponseSchema,
} from '../../dtos/product.response.dto.js';
import { ProductIdParamsSchema } from '../../dtos/product-id.dto.js';
import { StockEntryRequestSchema } from '../../dtos/stock-entry.dto.js';

// 201: cria um lançamento no livro-razão. Devolve o produto com o saldo novo.
export const receiveStockHandler = (receiveStock: ReceiveStockUseCase) =>
  new Elysia().post(
    '/:id/stock/entries',
    async ({ params, body }) =>
      ok(
        ProductResponseDto.fromEntity(
          await receiveStock.execute({ productId: params.id, ...body }),
        ),
        201,
      ),
    {
      params: ProductIdParamsSchema,
      body: StockEntryRequestSchema,
      response: {
        201: Envelope(ProductResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: {
        summary: 'Registra entrada de estoque',
        description:
          'Gera uma movimentação IN e soma ao saldo, na mesma transação. 400: quantidade inválida. 404: produto não encontrado.',
      },
    },
  );
