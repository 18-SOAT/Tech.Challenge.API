import { Elysia, t } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { SetPasswordUseCase } from '../../../application/use-cases/set-password.use-case.js';
import { SetPasswordRequestSchema } from '../../dtos/access-link.dto.js';

// 200 com `data: null` (e não 204): mantém o envelope em toda resposta da API.
export const setPasswordHandler = (setPassword: SetPasswordUseCase) =>
  new Elysia().post(
    '/set-password',
    async ({ body }) => {
      await setPassword.execute(body);
      return ok(null);
    },
    {
      body: SetPasswordRequestSchema,
      response: { 200: Envelope(t.Null()), 400: ApiError, 409: ApiError },
      detail: {
        summary: 'Define a senha pelo link de acesso',
        description:
          'Primeiro acesso: cria o login e liga ao cliente. Redefinição: troca a senha. O link vale uma vez. 400: senha inválida ou link inválido, expirado ou já utilizado. 409: o e-mail do cliente já é login de outra conta.',
      },
    },
  );
