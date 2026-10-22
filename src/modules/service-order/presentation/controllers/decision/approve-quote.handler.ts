import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { ApproveQuoteUseCase } from '../../../application/use-cases/approve-quote.use-case.js';
import { toQuoteDecider } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

export const approveQuoteHandler = (
  approveQuote: ApproveQuoteUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/:id/approve',
    async ({ params, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await approveQuote.execute({
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
        summary: 'Aprova o orçamento da OS',
        description:
          'O total vira o valor aprovado (congelado), a OS vai para IN_EXECUTION, as peças saem do estoque e a Ordem passa a IN_PROGRESS, tudo numa transação. Pelo cliente dono da ordem ou por um ADMIN. 403: outro cliente ou MECHANIC. 404: OS não encontrada. 409: orçamento já decidido ou estoque insuficiente (nada é gravado; a OS continua aguardando aprovação).',
      },
    },
  );
