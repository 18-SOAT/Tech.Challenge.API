import { Elysia } from 'elysia';
import { AuthError } from '../../../modules/auth/domain/errors/auth.error.js';
import type { EmployeeRole } from '../../../modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../../../modules/user/domain/enums/user-type.enum.js';
import type {
  AuthTokenPayload,
  TokenService,
} from '../../infrastructure/jwt/token-service.port.js';

export type AuthOptions = true | { roles: EmployeeRole[] };

function extractBearerToken(authorization: string | undefined): string {
  const [scheme, token] = authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) throw AuthError.tokenMissing();
  return token;
}

// Macro `auth`: `{ auth: true }` exige qualquer usuário autenticado;
// `{ auth: { roles: [...] } }` exige funcionário com um dos papéis.
// O `resolve` injeta `user` (claims do JWT) tipado no contexto do handler.
// Erros são AuthError (DomainError) → passam pelo errorHandler no envelope padrão.
// Ver docs/code/patterns/auth.md.
export const authPlugin = (tokenService: TokenService) => {
  // O guard do index.ts e o `auth` do handler rodam o resolve duas vezes no mesmo
  // request: memoiza por Request (WeakMap → some junto com o request) pra
  // verificar o token uma vez só.
  const verified = new WeakMap<Request, Promise<AuthTokenPayload>>();

  const verifyOnce = (request: Request, authorization?: string) => {
    let pending = verified.get(request);
    if (!pending) {
      const token = extractBearerToken(authorization);
      pending = tokenService.verify(token).catch(() => {
        throw AuthError.tokenInvalid();
      });
      verified.set(request, pending);
    }
    return pending;
  };

  const authorize = async (
    options: AuthOptions,
    request: Request,
    authorization?: string,
  ) => {
    const user = await verifyOnce(request, authorization);
    if (
      options !== true &&
      !(user.type === UserType.EMPLOYEE && options.roles.includes(user.role))
    ) {
      throw AuthError.forbidden();
    }
    return user;
  };

  // Ciclo do Elysia: parse → transform → validação → resolve → handler.
  // `transform` barra quem não pode (401/403) ANTES de validar o body: sem token
  // não se recebe 400 nem se gasta validação. `resolve` só injeta o `user` tipado,
  // reaproveitando a verificação memoizada.
  return new Elysia({ name: 'auth' }).macro({
    auth: (options: AuthOptions) => ({
      async transform({ headers, request }) {
        await authorize(options, request, headers.authorization);
      },
      async resolve({ headers, request }) {
        return {
          user: await authorize(options, request, headers.authorization),
        };
      },
    }),
  });
};

export type AuthPlugin = ReturnType<typeof authPlugin>;
