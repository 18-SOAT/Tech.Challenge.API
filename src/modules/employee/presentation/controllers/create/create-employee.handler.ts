import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { CreateEmployeeUseCase } from '../../../application/use-cases/create-employee.use-case.js';
import { CreateEmployeeRequestSchema } from '../../dtos/create-employee.dto.js';
import {
  EmployeeResponseDto,
  EmployeeResponseSchema,
} from '../../dtos/employee.response.dto.js';

export const createEmployeeHandler = (createEmployee: CreateEmployeeUseCase) =>
  new Elysia().post(
    '/',
    async ({ body }) =>
      ok(
        EmployeeResponseDto.fromEntity(await createEmployee.execute(body)),
        201,
      ),
    {
      body: CreateEmployeeRequestSchema,
      response: {
        201: Envelope(EmployeeResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Cadastra um funcionário e envia o link de acesso',
        description:
          'Cria o login (User EMPLOYEE) e o Employee numa transação e envia ao e-mail o link para definir a senha (POST /auth/set-password). Se o link não chegar ou expirar, o funcionário pede outro em POST /auth/password-reset. 400: dados inválidos. 409: e-mail já é login de alguém.',
      },
    },
  );
