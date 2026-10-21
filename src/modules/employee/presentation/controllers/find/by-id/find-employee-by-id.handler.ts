import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../../shared/presentation/http/envelope.js';
import type { FindEmployeeByIdUseCase } from '../../../../application/use-cases/find-employee-by-id.use-case.js';
import {
  EmployeeResponseDto,
  EmployeeResponseSchema,
} from '../../../dtos/employee.response.dto.js';
import { EmployeeIdParamsSchema } from '../../../dtos/employee-id.dto.js';

export const findEmployeeByIdHandler = (
  findEmployeeById: FindEmployeeByIdUseCase,
) =>
  new Elysia().get(
    '/:id',
    async ({ params }) =>
      ok(
        EmployeeResponseDto.fromEntity(
          await findEmployeeById.execute(params.id),
        ),
      ),
    {
      params: EmployeeIdParamsSchema,
      response: {
        200: Envelope(EmployeeResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: { summary: 'Detalha um funcionário' },
    },
  );
