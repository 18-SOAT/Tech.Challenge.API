import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { CreateServiceUseCase } from '../../../application/use-cases/create-service.use-case.js';
import { CreateServiceRequestSchema } from '../../dtos/create-service.dto.js';
import {
  ServiceResponseDto,
  ServiceResponseSchema,
} from '../../dtos/service.response.dto.js';

export const createServiceHandler = (createService: CreateServiceUseCase) =>
  new Elysia().post(
    '/',
    async ({ body }) =>
      ok(ServiceResponseDto.fromEntity(await createService.execute(body)), 201),
    {
      body: CreateServiceRequestSchema,
      response: {
        201: Envelope(ServiceResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Cadastra um serviço no catálogo',
        description:
          'O serviço nasce ativo. 400: dados inválidos (nome, preço com mais de 2 casas, duração). 409: nome já cadastrado.',
      },
    },
  );
