import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { CreateProductUseCase } from '../../../application/use-cases/create-product.use-case.js';
import { CreateProductRequestSchema } from '../../dtos/create-product.dto.js';
import {
  ProductResponseDto,
  ProductResponseSchema,
} from '../../dtos/product.response.dto.js';

export const createProductHandler = (createProduct: CreateProductUseCase) =>
  new Elysia().post(
    '/',
    async ({ body }) =>
      ok(ProductResponseDto.fromEntity(await createProduct.execute(body)), 201),
    {
      body: CreateProductRequestSchema,
      response: {
        201: Envelope(ProductResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Cadastra uma peça ou insumo',
        description:
          'O produto nasce ativo e com saldo 0; o saldo entra por POST /products/:id/stock/entries. 400: dados inválidos (SKU, preço com mais de 2 casas, mínimo). 409: SKU já cadastrado.',
      },
    },
  );
