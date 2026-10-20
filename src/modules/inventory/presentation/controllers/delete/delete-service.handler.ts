import { Elysia, t } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { DeleteServiceUseCase } from '../../../application/use-cases/delete-service.use-case.js';
import { ServiceIdParamsSchema } from '../../dtos/service-id.dto.js';

// 200 com `data: null` (e não 204): mantém o envelope em toda resposta da API.
export const deleteServiceHandler = (deleteService: DeleteServiceUseCase) =>
  new Elysia().delete(
    '/:id',
    async ({ params }) => {
      await deleteService.execute(params.id);
      return ok(null);
    },
    {
      params: ServiceIdParamsSchema,
      response: {
        200: Envelope(t.Null()),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Exclui um serviço nunca usado em OS',
        description:
          '404: serviço não encontrado. 409: serviço já usado em ordens de serviço — desative com PATCH { active: false }.',
      },
    },
  );
