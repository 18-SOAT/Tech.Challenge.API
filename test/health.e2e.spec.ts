import { beforeEach, describe, expect, it } from 'bun:test';
import { makeTestApp } from './fakes/make-test-app.js';
import { jsonRequest, readEnvelope } from './helpers/http.js';

describe('GET /health (e2e)', () => {
  const { app, database } = makeTestApp();

  beforeEach(() => {
    database.up = true;
  });

  it('responde 200 sem token, no envelope, com status, banco e dateTime em ISO', async () => {
    const response = await app.handle(jsonRequest('/health'));
    const body = await readEnvelope(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe(200);
    expect(body.message).toBeNull();
    expect(body.data.status).toBe('ok');
    expect(body.data.database).toBe('up');
    expect(new Date(body.data.dateTime).toISOString()).toBe(body.data.dateTime);
  });

  it('responde 503 com o diagnóstico quando o banco não responde', async () => {
    database.up = false;

    const response = await app.handle(jsonRequest('/health'));
    const body = await readEnvelope(response);

    expect(response.status).toBe(503);
    expect(body.status).toBe(503);
    expect(body.message).toBe('Banco de dados indisponível.');
    expect(body.data.status).toBe('error');
    expect(body.data.database).toBe('down');
  });

  it('rota inexistente responde 404 no envelope de erro', async () => {
    const response = await app.handle(jsonRequest('/nada'));

    expect(response.status).toBe(404);
    expect(await readEnvelope(response)).toStrictEqual({
      data: null,
      message: 'Rota não encontrada.',
      status: 404,
    });
  });
});
