import { t } from 'elysia';

export const LoginRequestSchema = t.Object(
  {
    email: t.String({
      format: 'email',
      error: 'E-mail inválido.',
      examples: ['joao@oficina.com'],
    }),
    password: t.String({
      minLength: 1,
      error: 'Senha obrigatória.',
      examples: ['senha-forte'],
    }),
  },
  { additionalProperties: false },
);

export type LoginRequest = typeof LoginRequestSchema.static;
