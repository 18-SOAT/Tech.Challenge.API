import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { UpdateServiceUseCase } from '../../../application/use-cases/update-service.use-case.js';
import {
  ServiceResponseDto,
  ServiceResponseSchema,
} from '../../dtos/service.response.dto.js';
import { ServiceIdParamsSchema } from '../../dtos/service-id.dto.js';
import { UpdateServiceRequestSchema } from '../../dtos/update-service.dto.js';

export const updateServiceHandler = (updateService: UpdateServiceUseCase) =>
  new Elysia().patch(
    '/:id',
    async ({ params, body }) =>
      ok(
        ServiceResponseDto.fromEntity(
          await updateService.execute({ id: params.id, ...body }),
        ),
      ),
    {
      params: ServiceIdParamsSchema,
      body: UpdateServiceRequestSchema,
      response: {
        200: Envelope(ServiceResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Altera, desativa ou reativa um serviço',
        description:
          'Só os campos enviados mudam; null remove descrição/duração. active=false desativa (não entra em orçamento novo). Preço novo não altera OS já orçada (snapshot). 400: dados inválidos. 404: serviço não encontrado. 409: nome de outro serviço.',
      },
    },
  );
