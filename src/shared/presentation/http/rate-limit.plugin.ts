import { Elysia } from 'elysia';
import type { RateLimiter } from '../../infrastructure/rate-limit/rate-limiter.port.js';
import type { ApiErrorBody } from './envelope.js';

export interface RateLimitConfig {
  limiter: RateLimiter;
  // true só atrás de proxy reverso confiável (ver TRUST_PROXY no env.ts).
  trustProxy: boolean;
}

interface ClientAddress {
  request: Request;
  server: { requestIP(request: Request): { address: string } | null } | null;
}

// IP de quem chamou. O X-Forwarded-For só vale com proxy: sem ele, o cliente
// escreveria o header que quisesse e ganharia um contador novo a cada requisição.
export function clientIp(
  { request, server }: ClientAddress,
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0];
    if (forwarded?.trim()) return forwarded.trim();
  }
  return server?.requestIP(request)?.address ?? 'unknown';
}

const TOO_MANY: ApiErrorBody = {
  data: null,
  message: 'Muitas tentativas. Aguarde e tente de novo.',
  status: 429,
};

// Limita as rotas do plugin que o usar: uma contagem por IP e, se `accountKey`
// devolver algo (ex: o e-mail do login), outra por conta — essa pega quem tenta a
// mesma conta de vários IPs. Infra HTTP, não regra de negócio: por isso fica aqui e
// não no use case. `as: 'scoped'` vale só para quem dá `.use()` neste plugin.
export const rateLimit = (
  name: string,
  config: RateLimitConfig,
  accountKey?: (body: unknown) => string | undefined,
) =>
  new Elysia().onBeforeHandle(
    { as: 'scoped' },
    ({ request, server, body, set }) => {
      const keys = [
        `${name}:ip:${clientIp({ request, server }, config.trustProxy)}`,
      ];
      const account = accountKey?.(body);
      if (account) keys.push(`${name}:account:${account}`);

      const results = keys.map((key) => config.limiter.hit(key));
      if (results.every((result) => result.allowed)) return;

      set.status = 429;
      set.headers['retry-after'] = String(
        Math.max(...results.map((result) => result.retryAfterSeconds)),
      );
      return TOO_MANY;
    },
  );

// Chave por conta do login: o e-mail normalizado como o use case faz.
export const emailAccountKey = (body: unknown): string | undefined => {
  const email = (body as { email?: unknown } | null)?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : undefined;
};
