import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListProductsUseCase } from '../../../application/use-cases/list-products.use-case.js';
import {
  ListProductsRequestSchema,
  ProductPageSchema,
} from '../../dtos/list-products.dto.js';
import { ProductResponseDto } from '../../dtos/product.response.dto.js';

// QUERY: seguro e idempotente como o GET, com filtros no corpo (ver list-customers).
export const listProductsHandler = (listProducts: ListProductsUseCase) =>
  new Elysia().route(
    'QUERY',
    '/',
    async ({ body }) =>
      ok(
        pageResponse(
          await listProducts.execute(body),
          body,
          ProductResponseDto.fromEntity,
        ),
      ),
    {
      body: ListProductsRequestSchema,
      response: {
        200: Envelope(ProductPageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Lista peças e insumos (método QUERY)',
        description:
          'Busca parcial por nome/SKU, filtros por tipo e status. belowMinimum=true: produtos abaixo do estoque mínimo, para reposição. Ordenado por nome. 400: filtro ou paginação inválidos.',
      },
    },
  );
