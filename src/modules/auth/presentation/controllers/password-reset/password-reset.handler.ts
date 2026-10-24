import { Elysia, t } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { RequestPasswordResetUseCase } from '../../../application/use-cases/request-password-reset.use-case.js';
import { PasswordResetRequestSchema } from '../../dtos/access-link.dto.js';

// 202 sempre: mesmo motivo do primeiro acesso (não revelar quem tem conta).
export const passwordResetHandler = (
  requestPasswordReset: RequestPasswordResetUseCase,
) =>
  new Elysia().post(
    '/password-reset',
    async ({ body }) => {
      await requestPasswordReset.execute(body);
      return ok(null, 202);
    },
    {
      body: PasswordResetRequestSchema,
      response: { 202: Envelope(t.Null()), 400: ApiError, 429: ApiError },
      detail: {
        summary: 'Solicita a redefinição de senha',
        description:
          'Se houver login ativo com esse e-mail, envia um link para definir uma nova senha. A resposta é sempre 202. 400: e-mail inválido.',
      },
    },
  );
