import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListEmployeesUseCase } from '../../../application/use-cases/list-employees.use-case.js';
import { EmployeeResponseDto } from '../../dtos/employee.response.dto.js';
import {
  EmployeePageSchema,
  ListEmployeesRequestSchema,
} from '../../dtos/list-employees.dto.js';

// QUERY: mesmo padrão das outras listagens (filtros e paginação no corpo).
export const listEmployeesHandler = (listEmployees: ListEmployeesUseCase) =>
  new Elysia().route(
    'QUERY',
    '/',
    async ({ body }) =>
      ok(
        pageResponse(
          await listEmployees.execute(body),
          body,
          EmployeeResponseDto.fromEntity,
        ),
      ),
    {
      body: ListEmployeesRequestSchema,
      response: {
        200: Envelope(EmployeePageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Lista funcionários com paginação e filtros (método QUERY)',
        description:
          'Ordenada por nome. Filtre por role: MECHANIC para escolher o mecânico de uma OS. 400: filtro ou paginação inválidos.',
      },
    },
  );
