import { describe, expect, it } from 'bun:test';
import { makeTestApp, TEST_CORS_ORIGIN } from './fakes/make-test-app.js';
import { readEnvelope } from './helpers/http.js';

// Segurança da camada HTTP: rate limit das rotas públicas de auth, headers de
// segurança em toda resposta e CORS só para as origens configuradas.

const request = (
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) =>
  new Request(`http://localhost${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(init.body === undefined
        ? {}
        : { 'content-type': 'application/json' }),
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

const login = (email: string, ip: string) =>
  request('/auth/login', {
    body: { email, password: 'senha-errada' },
    headers: { 'x-forwarded-for': ip },
  });

describe('Segurança HTTP (e2e)', () => {
  describe('rate limit', () => {
    it('login: a partir do limite, 429 com Retry-After no envelope padrão', async () => {
      const { app } = makeTestApp({ rateLimitMax: 2 });
      for (let i = 0; i < 2; i++) {
        const response = await app.handle(
          login('a@oficina.com', '203.0.113.1'),
        );
        expect(response.status).toBe(401);
      }

      const blocked = await app.handle(login('a@oficina.com', '203.0.113.1'));
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
      expect(await readEnvelope(blocked)).toEqual({
        data: null,
        message: 'Muitas tentativas. Aguarde e tente de novo.',
        status: 429,
      });
    });

    it('login: o mesmo e-mail de vários IPs também é barrado (contagem por conta)', async () => {
      const { app } = makeTestApp({ rateLimitMax: 2 });
      await app.handle(login('alvo@oficina.com', '203.0.113.1'));
      await app.handle(login('alvo@oficina.com', '203.0.113.2'));

      const third = await app.handle(login('alvo@oficina.com', '203.0.113.3'));
      expect(third.status).toBe(429);

      const otherAccount = await app.handle(
        login('outro@oficina.com', '203.0.113.4'),
      );
      expect(otherAccount.status).toBe(401);
    });

    it('cada rota e cada IP tem a própria contagem', async () => {
      const { app } = makeTestApp({ rateLimitMax: 1 });
      await app.handle(login('a@oficina.com', '203.0.113.1'));

      const reset = await app.handle(
        request('/auth/password-reset', {
          body: { email: 'b@oficina.com' },
          headers: { 'x-forwarded-for': '203.0.113.1' },
        }),
      );
      expect(reset.status).toBe(202);

      const otherIp = await app.handle(login('c@oficina.com', '203.0.113.9'));
      expect(otherIp.status).toBe(401);
    });

    it.each([
      ['/auth/register', {}],
      ['/auth/first-access', { document: '529.982.247-25' }],
      ['/auth/password-reset', { email: 'x@oficina.com' }],
      ['/auth/set-password', { token: 'x', password: 'senha-forte-123' }],
    ])('%s também tem rate limit', async (path, body) => {
      const { app } = makeTestApp({ rateLimitMax: 1 });
      const headers = { 'x-forwarded-for': '203.0.113.1' };
      const valid =
        path === '/auth/register'
          ? {
              name: 'João',
              email: 'joao@cliente.com',
              password: 'senha-forte-123',
              document: '529.982.247-25',
              phone: '11999999999',
            }
          : body;
      await app.handle(request(path, { body: valid, headers }));
      const blocked = await app.handle(request(path, { body: valid, headers }));
      expect(blocked.status).toBe(429);
    });

    it('rota autenticada não entra no rate limit de auth', async () => {
      const { app } = makeTestApp({ rateLimitMax: 1 });
      for (let i = 0; i < 3; i++) {
        const response = await app.handle(request('/auth/me'));
        expect(response.status).toBe(401);
      }
    });
  });

  describe('headers de segurança', () => {
    it.each([
      ['rota da API', '/health'],
      ['rota inexistente (404 do errorHandler)', '/nao-existe'],
    ])('%s: headers e CSP fechada', async (_, path) => {
      const { app } = makeTestApp();
      const response = await app.handle(request(path));
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('referrer-policy')).toBe('no-referrer');
      expect(response.headers.get('strict-transport-security')).toContain(
        'max-age=',
      );
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('content-security-policy')).toBe(
        "default-src 'none'; frame-ancestors 'none'",
      );
    });

    it('/openapi: CSP que libera o Scalar, sem afrouxar a API', async () => {
      const { app } = makeTestApp();
      const response = await app.handle(request('/openapi'));
      expect(response.status).toBe(200);
      const csp = response.headers.get('content-security-policy');
      expect(csp).toContain('script-src');
      expect(csp).toContain('https://cdn.jsdelivr.net');
      expect(csp).toContain("frame-ancestors 'none'");
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });

  describe('CORS', () => {
    const preflight = (origin: string, method = 'QUERY') =>
      request('/customers', {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': method,
          'access-control-request-headers': 'authorization,content-type',
        },
      });

    it('origem configurada: preflight libera QUERY e o header Authorization', async () => {
      const { app } = makeTestApp();
      const response = await app.handle(preflight(TEST_CORS_ORIGIN));
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe(
        TEST_CORS_ORIGIN,
      );
      expect(response.headers.get('access-control-allow-methods')).toContain(
        'QUERY',
      );
      expect(
        response.headers.get('access-control-allow-headers')?.toLowerCase(),
      ).toContain('authorization');
      expect(
        response.headers.get('access-control-allow-credentials'),
      ).toBeNull();
    });

    it('origem fora da lista: sem Access-Control-Allow-Origin (o navegador barra)', async () => {
      const { app } = makeTestApp();
      const response = await app.handle(
        preflight('https://site-malicioso.com'),
      );
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('sem CORS_ORIGINS: nenhuma origem é liberada', async () => {
      const { app } = makeTestApp({ corsOrigins: [] });
      const response = await app.handle(preflight(TEST_CORS_ORIGIN));
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });
  });
});
