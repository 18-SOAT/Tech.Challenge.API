import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../../shared/presentation/http/envelope.js';
import type { FindCustomerByIdUseCase } from '../../../../application/use-cases/find-customer-by-id.use-case.js';
import {
  CustomerResponseDto,
  CustomerResponseSchema,
} from '../../../dtos/customer.response.dto.js';
import { CustomerIdParamsSchema } from '../../../dtos/customer-id.dto.js';

export const findCustomerByIdHandler = (
  findCustomerById: FindCustomerByIdUseCase,
) =>
  new Elysia().get(
    '/:id',
    async ({ params }) =>
      ok(
        CustomerResponseDto.fromEntity(
          await findCustomerById.execute(params.id),
        ),
      ),
    {
      params: CustomerIdParamsSchema,
      response: {
        200: Envelope(CustomerResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: { summary: 'Detalha um cliente' },
    },
  );
