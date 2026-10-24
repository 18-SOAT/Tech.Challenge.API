import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { GetExecutionTimeUseCase } from '../../../application/use-cases/get-execution-time.use-case.js';
import {
  ExecutionTimeRequestSchema,
  ExecutionTimeResponseSchema,
  toExecutionTimeResponse,
} from '../../dtos/execution-time.dto.js';
import { toDate } from '../../dtos/query-fields.js';

export const getExecutionTimeHandler = (
  getExecutionTime: GetExecutionTimeUseCase,
) =>
  new Elysia().route(
    'QUERY',
    '/execution-time',
    async ({ body }) =>
      ok(
        toExecutionTimeResponse(
          await getExecutionTime.execute({
            serviceId: body.serviceId,
            finishedFrom: toDate(body.finishedFrom),
            finishedTo: toDate(body.finishedTo),
          }),
        ),
      ),
    {
      body: ExecutionTimeRequestSchema,
      response: {
        200: Envelope(ExecutionTimeResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Tempo médio de execução (método QUERY)',
        description:
          'Média, em minutos, de Em execução → Finalizada das OS finalizadas no período: global e por serviço do catálogo (com a duração estimada, para comparar). Uma OS com vários serviços conta para cada um. Com serviceId, só as OS que contêm o serviço.',
      },
    },
  );
