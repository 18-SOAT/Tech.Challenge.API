import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { CompleteDiagnosisUseCase } from '../../../application/use-cases/complete-diagnosis.use-case.js';
import { toActor } from '../../actor.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from '../../dtos/service-order.response.dto.js';
import { ServiceOrderIdParamsSchema } from '../../dtos/service-order-id.dto.js';

// POST num sub-recurso: é um comando do domínio (transição de status), não um PATCH
// do campo `status` — quem decide o próximo status é a entity.
export const completeDiagnosisHandler = (
  completeDiagnosis: CompleteDiagnosisUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/:id/complete-diagnosis',
    async ({ params, user }) =>
      ok(
        ServiceOrderResponseDto.fromEntity(
          await completeDiagnosis.execute({
            serviceOrderId: params.id,
            actor: toActor(user),
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
        summary: 'Conclui o diagnóstico e gera o orçamento',
        description:
          'A OS vai para AWAITING_APPROVAL com o total dos itens, e o orçamento é enviado ao e-mail do cliente. 403: OS de outro mecânico. 404: OS não encontrada. 409: OS fora do diagnóstico, sem mecânico atribuído ou sem itens.',
      },
    },
  );
