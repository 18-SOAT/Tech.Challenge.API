import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import type { AuthUseCases } from '../auth.container.js';
import { loginHandler } from './controllers/login/login.handler.js';
import { meHandler } from './controllers/me/me.handler.js';
import { registerHandler } from './controllers/register/register.handler.js';

export const authRoutes = (useCases: AuthUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .use(auth)
    // Públicas por requisito de negócio: cadastro e login.
    .use(registerHandler(useCases.registerCustomer))
    .use(loginHandler(useCases.login))
    // Protegidas: rota nova entra AQUI por padrão.
    .guard({ auth: true, detail: { security: [{ bearerAuth: [] }] } }, (app) =>
      app.use(meHandler(useCases.getMe, auth)),
    );
