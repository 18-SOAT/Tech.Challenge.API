import { type AnyElysia, Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import {
  emailAccountKey,
  type RateLimitConfig,
  rateLimit,
} from '../../../shared/presentation/http/rate-limit.plugin.js';
import type { AuthUseCases } from '../auth.container.js';
import { firstAccessHandler } from './controllers/first-access/first-access.handler.js';
import { loginHandler } from './controllers/login/login.handler.js';
import { meHandler } from './controllers/me/me.handler.js';
import { passwordResetHandler } from './controllers/password-reset/password-reset.handler.js';
import { registerHandler } from './controllers/register/register.handler.js';
import { setPasswordHandler } from './controllers/set-password/set-password.handler.js';

// Rota pública com rate limit próprio: o plugin vem antes do handler na mesma
// instância, então o hook `scoped` vale só para ela.
const limited = <Handler extends AnyElysia>(
  plugin: ReturnType<typeof rateLimit>,
  handler: Handler,
) => new Elysia().use(plugin).use(handler);

export const authRoutes = (
  useCases: AuthUseCases,
  auth: AuthPlugin,
  rateLimitConfig: RateLimitConfig,
) =>
  new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .use(auth)
    // Públicas por requisito de negócio: cadastro, login e link de acesso (quem ainda
    // não tem senha não tem token — o e-mail é a prova de posse da conta). Por serem
    // públicas, todas têm rate limit: o login contra força bruta (por IP e por
    // e-mail), as de link contra disparo de e-mail em massa.
    .use(
      limited(
        rateLimit('register', rateLimitConfig),
        registerHandler(useCases.registerCustomer),
      ),
    )
    .use(
      limited(
        rateLimit('login', rateLimitConfig, emailAccountKey),
        loginHandler(useCases.login),
      ),
    )
    .use(
      limited(
        rateLimit('first-access', rateLimitConfig),
        firstAccessHandler(useCases.requestFirstAccess),
      ),
    )
    .use(
      limited(
        rateLimit('password-reset', rateLimitConfig, emailAccountKey),
        passwordResetHandler(useCases.requestPasswordReset),
      ),
    )
    .use(
      limited(
        rateLimit('set-password', rateLimitConfig),
        setPasswordHandler(useCases.setPassword),
      ),
    )
    // Protegidas: rota nova entra AQUI por padrão.
    .guard({ auth: true, detail: { security: [{ bearerAuth: [] }] } }, (app) =>
      app.use(meHandler(useCases.getMe, auth)),
    );
