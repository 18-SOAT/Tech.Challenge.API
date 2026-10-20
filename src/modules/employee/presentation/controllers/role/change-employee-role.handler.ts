import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { ChangeEmployeeRoleUseCase } from '../../../application/use-cases/change-employee-role.use-case.js';
import { ChangeEmployeeRoleRequestSchema } from '../../dtos/change-employee-role.dto.js';
import {
  EmployeeResponseDto,
  EmployeeResponseSchema,
} from '../../dtos/employee.response.dto.js';
import { EmployeeIdParamsSchema } from '../../dtos/employee-id.dto.js';

// Sub-recurso `/role` em vez de PATCH /:id genérico: trocar o papel é um comando
// do domínio com regra própria (último ADMIN), não uma edição de cadastro.
export const changeEmployeeRoleHandler = (
  changeEmployeeRole: ChangeEmployeeRoleUseCase,
) =>
  new Elysia().patch(
    '/:id/role',
    async ({ params, body }) =>
      ok(
        EmployeeResponseDto.fromEntity(
          await changeEmployeeRole.execute({ id: params.id, role: body.role }),
        ),
      ),
    {
      params: EmployeeIdParamsSchema,
      body: ChangeEmployeeRoleRequestSchema,
      response: {
        200: Envelope(EmployeeResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Altera o papel de um funcionário',
        description:
          'O papel novo vale a partir do próximo login (o token atual carrega o papel antigo até expirar). 404: funcionário não encontrado. 409: é o último ADMIN — promova outro antes.',
      },
    },
  );
