import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { LoginUseCase } from '../../../application/use-cases/login.use-case.js';
import { LoginRequestSchema } from '../../dtos/login.dto.js';
import {
  LoginResponseDto,
  LoginResponseSchema,
} from '../../dtos/login.response.dto.js';

export const loginHandler = (login: LoginUseCase) =>
  new Elysia().post(
    '/login',
    async ({ body }) =>
      ok(LoginResponseDto.fromOutput(await login.execute(body))),
    {
      body: LoginRequestSchema,
      response: {
        200: Envelope(LoginResponseSchema),
        400: ApiError,
        401: ApiError,
      },
      detail: {
        summary: 'Autentica um usuário e devolve o access token',
        description:
          '401 com mensagem única ("Credenciais inválidas.") para e-mail inexistente, senha errada ou usuário inativo.',
      },
    },
  );
