import { describe, expect, it } from 'bun:test';
import { readEnv } from './env.js';

const SECRET = 'x'.repeat(32);
const base = { DATABASE_URL: 'postgresql://localhost/db', JWT_SECRET: SECRET };

describe('readEnv', () => {
  it('só com o obrigatório: padrões seguros', () => {
    expect(readEnv(base)).toMatchObject({
      PORT: 3000,
      SMTP_PORT: 1025,
      APP_URL: 'http://localhost:3000',
      CORS_ORIGINS: [],
      RATE_LIMIT_MAX: 10,
      RATE_LIMIT_WINDOW_SECONDS: 60,
      TRUST_PROXY: false,
    });
  });

  it('lê os valores informados', () => {
    expect(
      readEnv({
        ...base,
        PORT: '8080',
        CORS_ORIGINS: 'http://localhost:5173, https://oficina.app',
        RATE_LIMIT_MAX: '3',
        RATE_LIMIT_WINDOW_SECONDS: '900',
        TRUST_PROXY: 'true',
        SMTP_PASS: 'abcd efgh',
      }),
    ).toMatchObject({
      PORT: 8080,
      CORS_ORIGINS: ['http://localhost:5173', 'https://oficina.app'],
      RATE_LIMIT_MAX: 3,
      RATE_LIMIT_WINDOW_SECONDS: 900,
      TRUST_PROXY: true,
      SMTP_PASS: 'abcdefgh',
    });
  });

  it.each([
    [{ DATABASE_URL: '' }, /DATABASE_URL não definido/],
    [{ JWT_SECRET: '' }, /JWT_SECRET não definido/],
    [{ JWT_SECRET: 'curto' }, /JWT_SECRET curto demais/],
    [{ PORT: 'abc' }, /PORT inválido/],
    [{ PORT: '70000' }, /PORT inválido/],
    [{ SMTP_PORT: '1.5' }, /SMTP_PORT inválido/],
    [{ APP_URL: 'localhost' }, /APP_URL inválido/],
    [{ CORS_ORIGINS: 'http://a.com/path' }, /CORS_ORIGINS inválido/],
    [{ CORS_ORIGINS: '*' }, /CORS_ORIGINS inválido/],
    [{ RATE_LIMIT_MAX: '0' }, /RATE_LIMIT_MAX inválido/],
    [{ TRUST_PROXY: 'yes' }, /TRUST_PROXY inválido/],
  ])('falha alto com %p', (override, message) => {
    expect(() => readEnv({ ...base, ...override })).toThrow(message);
  });
});
