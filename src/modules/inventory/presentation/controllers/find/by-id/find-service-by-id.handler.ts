import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../../shared/presentation/http/envelope.js';
import type { FindServiceByIdUseCase } from '../../../../application/use-cases/find-service-by-id.use-case.js';
import {
  ServiceResponseDto,
  ServiceResponseSchema,
} from '../../../dtos/service.response.dto.js';
import { ServiceIdParamsSchema } from '../../../dtos/service-id.dto.js';

export const findServiceByIdHandler = (
  findServiceById: FindServiceByIdUseCase,
) =>
  new Elysia().get(
    '/:id',
    async ({ params }) =>
      ok(
        ServiceResponseDto.fromEntity(await findServiceById.execute(params.id)),
      ),
    {
      params: ServiceIdParamsSchema,
      response: {
        200: Envelope(ServiceResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: { summary: 'Detalha um serviço do catálogo' },
    },
  );
