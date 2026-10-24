export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  // Link de acesso (primeiro acesso / redefinição de senha) enviado por e-mail.
  ACCESS_LINK_EXPIRES_IN: string;
  APP_URL: string; // base pública usada para montar o link no e-mail
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER?: string; // vazio = SMTP sem login (Mailpit)
  SMTP_PASS?: string;
  MAIL_FROM: string;
  // Origens que o navegador pode usar para chamar a API (CORS). Vazio = nenhuma.
  CORS_ORIGINS: string[];
  // Rate limit das rotas públicas de auth: até MAX requisições por janela.
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_SECONDS: number;
  // Atrás de um proxy reverso, o IP do cliente vem do X-Forwarded-For. Sem proxy,
  // confiar nesse header deixaria qualquer um trocar de IP e fugir do rate limit.
  TRUST_PROXY: boolean;
}

// HS256 com segredo curto é quebrável por força bruta offline: 32 bytes é o mínimo
// recomendado (o .env.example sugere `openssl rand -base64 32`, 44 caracteres).
const MIN_JWT_SECRET_LENGTH = 32;

const fail = (message: string): never => {
  throw new Error(`${message} Configure no .env (ver .env.example).`);
};

// Lido uma vez no boot (o Bun já carrega o .env sozinho). Falha alto: valor
// inválido derruba a subida em vez de virar um padrão em silêncio (ex: PORT=abc
// subindo na 3000, ou JWT_SECRET vazio assinando tokens).
export function readEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const required = (name: 'DATABASE_URL' | 'JWT_SECRET'): string =>
    source[name] || fail(`${name} não definido.`);

  // Vazio = padrão; preenchido precisa ser um inteiro dentro do intervalo.
  const integer = (
    name: string,
    fallback: number,
    min: number,
    max: number,
  ) => {
    const raw = source[name];
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      fail(`${name} inválido: "${raw}" (inteiro de ${min} a ${max}).`);
    }
    return value;
  };

  const url = (name: string, fallback: string): string => {
    const raw = source[name] || fallback;
    if (!URL.canParse(raw)) fail(`${name} inválido: "${raw}" (URL completa).`);
    return raw;
  };

  const boolean = (name: string): boolean => {
    const raw = source[name];
    if (!raw) return false;
    if (raw !== 'true' && raw !== 'false') {
      fail(`${name} inválido: "${raw}" (true ou false).`);
    }
    return raw === 'true';
  };

  // Lista separada por vírgula; cada item é uma origem (esquema + host + porta),
  // sem caminho — é assim que o navegador manda o header Origin.
  const origins = (name: string): string[] =>
    (source[name] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        if (!URL.canParse(item) || new URL(item).origin !== item) {
          fail(`${name} inválido: "${item}" (ex: http://localhost:5173).`);
        }
        return item;
      });

  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    fail(
      `JWT_SECRET curto demais (mínimo ${MIN_JWT_SECRET_LENGTH} caracteres; gere com \`openssl rand -base64 32\`).`,
    );
  }

  return {
    DATABASE_URL: required('DATABASE_URL'),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: source.JWT_EXPIRES_IN || '1h',
    PORT: integer('PORT', 3000, 1, 65535),
    ACCESS_LINK_EXPIRES_IN: source.ACCESS_LINK_EXPIRES_IN || '15m',
    APP_URL: url('APP_URL', 'http://localhost:3000'),
    SMTP_HOST: source.SMTP_HOST || 'localhost',
    SMTP_PORT: integer('SMTP_PORT', 1025, 1, 65535),
    SMTP_USER: source.SMTP_USER || undefined,
    // Senha de app do Gmail vem exibida em grupos ("abcd efgh ..."): sem espaços.
    SMTP_PASS: source.SMTP_PASS?.replace(/\s/g, '') || undefined,
    MAIL_FROM: source.MAIL_FROM || 'Oficina <nao-responda@oficina.local>',
    CORS_ORIGINS: origins('CORS_ORIGINS'),
    RATE_LIMIT_MAX: integer('RATE_LIMIT_MAX', 10, 1, 100_000),
    RATE_LIMIT_WINDOW_SECONDS: integer(
      'RATE_LIMIT_WINDOW_SECONDS',
      60,
      1,
      86_400,
    ),
    TRUST_PROXY: boolean('TRUST_PROXY'),
  };
}
