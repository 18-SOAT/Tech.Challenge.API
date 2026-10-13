import { Elysia, t } from 'elysia';
import { Envelope, ok } from '../http/envelope.js';

const HealthSchema = t.Object({
  status: t.Literal('ok'),
  dateTime: t.String({ format: 'date-time' }),
});

// Pública: usada por load balancer/orquestrador pra saber se o processo está de pé.
// TODO: checar o banco (SELECT 1) — hoje só confirma que o processo responde.
export const healthHandler = () =>
  new Elysia({ tags: ['Health'] }).get(
    '/health',
    () => ok({ status: 'ok' as const, dateTime: new Date().toISOString() }),
    {
      response: { 200: Envelope(HealthSchema) },
      detail: { summary: 'Verifica se a API está no ar' },
    },
  );
