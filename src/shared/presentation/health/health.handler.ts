import { Elysia, status, t } from 'elysia';
import type { DatabaseHealthCheck } from '../../infrastructure/health/database-health.port.js';
import { Envelope, ok } from '../http/envelope.js';

const HealthSchema = t.Object({
  status: t.Union([t.Literal('ok'), t.Literal('error')]),
  database: t.Union([t.Literal('up'), t.Literal('down')]),
  dateTime: t.String({ format: 'date-time' }),
});

// 503 mantém o corpo com o diagnóstico (não é ApiError com data null): quem chama o
// /health quer saber O QUE caiu, não só que falhou.
const UnavailableSchema = t.Object({
  data: HealthSchema,
  message: t.String({ examples: ['Banco de dados indisponível.'] }),
  status: t.Number({ examples: [503] }),
});

// Pública: usada pelo healthcheck do compose / load balancer pra saber se a instância
// pode receber tráfego. 503 = processo de pé, mas sem banco.
export const healthHandler = (database: DatabaseHealthCheck) =>
  new Elysia({ tags: ['Health'] }).get(
    '/health',
    async () => {
      const dateTime = new Date().toISOString();

      if (!(await database.isUp())) {
        return status(503, {
          data: {
            status: 'error' as const,
            database: 'down' as const,
            dateTime,
          },
          message: 'Banco de dados indisponível.',
          status: 503,
        });
      }

      return ok({ status: 'ok' as const, database: 'up' as const, dateTime });
    },
    {
      response: { 200: Envelope(HealthSchema), 503: UnavailableSchema },
      detail: { summary: 'Verifica se a API e o banco de dados estão no ar' },
    },
  );
