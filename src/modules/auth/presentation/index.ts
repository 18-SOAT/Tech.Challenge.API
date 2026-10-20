import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import type { AuthUseCases } from '../auth.container.js';
import { firstAccessHandler } from './controllers/first-access/first-access.handler.js';
import { loginHandler } from './controllers/login/login.handler.js';
import { meHandler } from './controllers/me/me.handler.js';
import { passwordResetHandler } from './controllers/password-reset/password-reset.handler.js';
import { registerHandler } from './controllers/register/register.handler.js';
import { setPasswordHandler } from './controllers/set-password/set-password.handler.js';

export const authRoutes = (useCases: AuthUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .use(auth)
    // Públicas por requisito de negócio: cadastro, login e link de acesso (quem ainda
    // não tem senha não tem token — o e-mail é a prova de posse da conta).
    .use(registerHandler(useCases.registerCustomer))
    .use(loginHandler(useCases.login))
    .use(firstAccessHandler(useCases.requestFirstAccess))
    .use(passwordResetHandler(useCases.requestPasswordReset))
    .use(setPasswordHandler(useCases.setPassword))
    // Protegidas: rota nova entra AQUI por padrão.
    .guard({ auth: true, detail: { security: [{ bearerAuth: [] }] } }, (app) =>
      app.use(meHandler(useCases.getMe, auth)),
    );
