import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { RegisterCustomerUseCase } from '../../../application/use-cases/register-customer.use-case.js';
import { RegisterRequestSchema } from '../../dtos/register.dto.js';
import {
  UserResponseDto,
  UserResponseSchema,
} from '../../dtos/user.response.dto.js';

export const registerHandler = (registerCustomer: RegisterCustomerUseCase) =>
  new Elysia().post(
    '/register',
    async ({ body }) =>
      ok(UserResponseDto.fromEntity(await registerCustomer.execute(body)), 201),
    {
      body: RegisterRequestSchema,
      response: {
        201: Envelope(UserResponseSchema),
        400: ApiError,
        409: ApiError,
        429: ApiError,
      },
      detail: {
        summary: 'Cadastra um cliente com login',
        description:
          '400: dados inválidos (e-mail, senha, CPF/CNPJ, telefone). 409: e-mail ou CPF/CNPJ já cadastrado.',
      },
    },
  );
