import { buildApp } from '../../../src/build-app.js';
import { readEnv } from '../../../src/shared/infrastructure/config/env.js';
import type { EnvelopeBody } from '../../helpers/http.js';
import { TEST_DATABASE_URL } from '../../integration/database.js';

export interface Api {
  baseUrl: string;
  stop: () => Promise<void>;
}

export interface ApiResponse<T = any> {
  status: number;
  body: EnvelopeBody<T>;
  headers: Headers;
}

// Sobe a mesma montagem do server.ts (containers reais) numa porta aleatória.
// O ambiente é explícito — nada do `process.env` além das URLs de teste —, para o
// `.env` de desenvolvimento nunca apontar o teste para o banco ou o SMTP errados.
export function startApi(overrides: Record<string, string> = {}): Api {
  const env = readEnv({
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_SECRET: 'black-box-secret-com-mais-de-32-caracteres',
    SMTP_HOST: process.env.MAILPIT_SMTP_HOST ?? 'localhost',
    SMTP_PORT: process.env.MAILPIT_SMTP_PORT ?? '1025',
    RATE_LIMIT_MAX: '100000',
    ...overrides,
  });
  const app = buildApp(env).listen(0);

  return {
    baseUrl: `http://localhost:${app.server?.port}`,
    stop: async () => {
      await app.stop();
    },
  };
}

export interface RequestOptions {
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

// Chamada HTTP de verdade (fetch), como um front-end faria. QUERY é um método
// como outro qualquer para o fetch.
export async function request<T = any>(
  api: Api,
  method: string,
  path: string,
  { token, body, headers = {} }: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${api.baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // Só JSON tem envelope; a UI do /openapi, por exemplo, é HTML.
  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');

  return {
    status: response.status,
    body: (isJson ? await response.json() : null) as EnvelopeBody<T>,
    headers: response.headers,
  };
}
