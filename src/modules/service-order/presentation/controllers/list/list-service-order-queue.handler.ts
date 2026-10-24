import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListServiceOrderQueueUseCase } from '../../../application/use-cases/list-service-order-queue.use-case.js';
import { toActor } from '../../actor.js';
import {
  ServiceOrderPageSchema,
  ServiceOrderQueueRequestSchema,
} from '../../dtos/list-service-orders.dto.js';
import { ServiceOrderResponseDto } from '../../dtos/service-order.response.dto.js';

export const listServiceOrderQueueHandler = (
  listServiceOrderQueue: ListServiceOrderQueueUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).route(
    'QUERY',
    '/queue',
    async ({ body, user }) =>
      ok(
        pageResponse(
          await listServiceOrderQueue.execute({
            ...body,
            actor: toActor(user),
          }),
          body,
          ServiceOrderResponseDto.fromEntity,
        ),
      ),
    {
      auth: true,
      body: ServiceOrderQueueRequestSchema,
      response: {
        200: Envelope(ServiceOrderPageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Fila de OS (método QUERY)',
        description:
          'OS abertas na ordem de atendimento: em execução, aguardando aprovação e em diagnóstico; dentro do status, a ordem que chegou antes. Finalizadas e rejeitadas ficam fora. O MECHANIC vê a fila dele; o ADMIN, a da oficina ou a de um mecânico (assigneeId).',
      },
    },
  );
