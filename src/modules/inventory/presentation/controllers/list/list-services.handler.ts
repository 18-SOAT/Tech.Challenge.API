import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListServicesUseCase } from '../../../application/use-cases/list-services.use-case.js';
import {
  ListServicesRequestSchema,
  ServicePageSchema,
} from '../../dtos/list-services.dto.js';
import { ServiceResponseDto } from '../../dtos/service.response.dto.js';

// QUERY: seguro e idempotente como o GET, com filtros no corpo (ver list-customers).
export const listServicesHandler = (listServices: ListServicesUseCase) =>
  new Elysia().route(
    'QUERY',
    '/',
    async ({ body }) =>
      ok(
        pageResponse(
          await listServices.execute(body),
          body,
          ServiceResponseDto.fromEntity,
        ),
      ),
    {
      body: ListServicesRequestSchema,
      response: {
        200: Envelope(ServicePageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Lista o catálogo de serviços (método QUERY)',
        description:
          'Busca parcial por nome e/ou filtro por status (active). Ordenado por nome. 400: filtro ou paginação inválidos.',
      },
    },
  );
