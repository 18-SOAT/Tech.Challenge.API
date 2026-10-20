import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { UpdateCustomerUseCase } from '../../../application/use-cases/update-customer.use-case.js';
import {
  CustomerResponseDto,
  CustomerResponseSchema,
} from '../../dtos/customer.response.dto.js';
import { CustomerIdParamsSchema } from '../../dtos/customer-id.dto.js';
import { UpdateCustomerRequestSchema } from '../../dtos/update-customer.dto.js';

export const updateCustomerHandler = (updateCustomer: UpdateCustomerUseCase) =>
  new Elysia().patch(
    '/:id',
    async ({ params, body }) =>
      ok(
        CustomerResponseDto.fromEntity(
          await updateCustomer.execute({ id: params.id, ...body }),
        ),
      ),
    {
      params: CustomerIdParamsSchema,
      body: UpdateCustomerRequestSchema,
      response: {
        200: Envelope(CustomerResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: {
        summary: 'Altera nome, e-mail e/ou telefone de um cliente',
        description:
          'Só os campos enviados mudam; `phone: null` remove o telefone. O CPF/CNPJ não é alterável. 400: dados inválidos. 404: cliente não encontrado.',
      },
    },
  );
