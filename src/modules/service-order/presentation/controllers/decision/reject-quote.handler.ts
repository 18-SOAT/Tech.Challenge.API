import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { RejectQuoteUseCase } from '../../../application/use-cases/reject-quote.use-case.js';
import { toQuoteDecider } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

export const rejectQuoteHandler = (
  rejectQuote: RejectQuoteUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/:id/reject',
    async ({ params, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await rejectQuote.execute({
            serviceOrderId: params.id,
            decider: toQuoteDecider(user),
          }),
        ),
      ),
    {
      auth: true,
      params: ServiceOrderIdParamsSchema,
      response: {
        200: Envelope(ServiceOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Rejeita o orçamento da OS',
        description:
          'A OS vai para REJECTED (terminal), sem execução nem baixa de estoque. Pelo cliente dono da ordem ou por um ADMIN. 403: outro cliente ou MECHANIC. 404: OS não encontrada. 409: orçamento já decidido.',
      },
    },
  );
