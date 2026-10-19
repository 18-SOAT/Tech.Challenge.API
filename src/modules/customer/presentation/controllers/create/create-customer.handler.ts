import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { CreateCustomerUseCase } from '../../../application/use-cases/create-customer.use-case.js';
import { CreateCustomerRequestSchema } from '../../dtos/create-customer.dto.js';
import {
  CustomerResponseDto,
  CustomerResponseSchema,
} from '../../dtos/customer.response.dto.js';

export const createCustomerHandler = (createCustomer: CreateCustomerUseCase) =>
  new Elysia().post(
    '/',
    async ({ body }) =>
      ok(
        CustomerResponseDto.fromEntity(await createCustomer.execute(body)),
        201,
      ),
    {
      body: CreateCustomerRequestSchema,
      response: {
        201: Envelope(CustomerResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Cadastra um cliente no balcão (sem login)',
        description:
          '400: dados inválidos (nome, CPF/CNPJ, e-mail, telefone). 409: CPF/CNPJ já cadastrado.',
      },
    },
  );
