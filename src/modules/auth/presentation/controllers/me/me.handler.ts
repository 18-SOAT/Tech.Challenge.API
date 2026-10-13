import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { GetMeUseCase } from '../../../application/use-cases/get-me.use-case.js';
import {
  AuthenticatedUserResponseDto,
  AuthenticatedUserSchema,
} from '../../dtos/authenticated-user.response.dto.js';

// `.use(auth)` + `auth: true`: dá o `user` tipado aqui dentro. A proteção do módulo
// é o guard do index.ts (ver docs/code/patterns/controller.md).
export const meHandler = (getMe: GetMeUseCase, auth: AuthPlugin) =>
  new Elysia()
    .use(auth)
    .get(
      '/me',
      async ({ user }) =>
        ok(
          AuthenticatedUserResponseDto.fromClaims(
            await getMe.execute(user.sub),
          ),
        ),
      {
        auth: true,
        response: {
          200: Envelope(AuthenticatedUserSchema),
          401: ApiError,
        },
        detail: {
          summary: 'Dados do usuário autenticado',
          description:
            'Relê o usuário do banco: reflete desativação ou troca de papel feitas depois da emissão do token.',
        },
      },
    );
