import { openapi } from '@elysia/openapi';
import { Elysia } from 'elysia';
import pkg from '../package.json' with { type: 'json' };
import type { TokenService } from './shared/infrastructure/jwt/token-service.port.js';
import { authPlugin } from './shared/presentation/auth/auth.plugin.js';
import { healthHandler } from './shared/presentation/health/health.handler.js';
import { errorHandler } from './shared/presentation/http/error-handler.plugin.js';
import './shared/presentation/http/formats.js';

export interface AppDeps {
  tokenService: TokenService;
}

// Monta a aplicação sem subir servidor: o server.ts passa os containers reais e o
// e2e passa fakes (sem banco). Ordem importa — hooks só valem pras rotas
// registradas depois deles: errorHandler primeiro, depois docs, depois as rotas.
export function createApp(deps: AppDeps) {
  const auth = authPlugin(deps.tokenService);

  return new Elysia()
    .use(errorHandler)
    .use(
      openapi({
        documentation: {
          info: {
            title: 'Tech Challenge API — Oficina Mecânica',
            version: pkg.version,
            description:
              'Sistema integrado de atendimento e execução de serviços. Toda resposta segue o envelope { data, message, status }.',
          },
          tags: [{ name: 'Health', description: 'Disponibilidade da API' }],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
        },
      }),
    )
    .use(auth)
    .use(healthHandler());
}

export type App = ReturnType<typeof createApp>;
