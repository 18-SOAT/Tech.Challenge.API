import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { ListCustomersUseCase } from '../../../application/use-cases/list-customers.use-case.js';
import { CustomerResponseDto } from '../../dtos/customer.response.dto.js';
import {
  CustomerPageSchema,
  ListCustomersRequestSchema,
} from '../../dtos/list-customers.dto.js';

// QUERY (draft IETF "The HTTP QUERY Method"): seguro e idempotente como o GET, mas
// com corpo. O Elysia não tem atalho `.query()`; `.route()` aceita qualquer verbo.
export const listCustomersHandler = (listCustomers: ListCustomersUseCase) =>
  new Elysia().route(
    'QUERY',
    '/',
    async ({ body }) => {
      const page = await listCustomers.execute(body);
      return ok({
        items: page.items.map(CustomerResponseDto.fromEntity),
        total: page.total,
        page: body.page,
        limit: body.limit,
      });
    },
    {
      body: ListCustomersRequestSchema,
      response: {
        200: Envelope(CustomerPageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Lista clientes com paginação e filtros (método QUERY)',
        description:
          'Filtros e paginação vão no corpo: QUERY é seguro e idempotente como o GET. 400: filtro ou paginação inválidos.',
      },
    },
  );
