import { t } from 'elysia';

// Borda HTTP do link de acesso. Os VOs (Document, Email, Password) revalidam no
// domínio — defesa em profundidade. Ver docs/code/patterns/dto.md.
export const FirstAccessRequestSchema = t.Object(
  {
    document: t.String({
      format: 'cpf-cnpj',
      error: 'CPF/CNPJ inválido.',
      description: 'CPF (11 dígitos) ou CNPJ (14), com ou sem máscara',
      examples: ['529.982.247-25'],
    }),
  },
  { additionalProperties: false },
);

export const PasswordResetRequestSchema = t.Object(
  {
    email: t.String({
      format: 'email',
      error: 'E-mail inválido.',
      examples: ['joao@oficina.com'],
    }),
  },
  { additionalProperties: false },
);

export const SetPasswordRequestSchema = t.Object(
  {
    token: t.String({
      minLength: 1,
      error: 'Token do link de acesso obrigatório.',
      description: 'Token recebido no e-mail do link de acesso',
    }),
    password: t.String({
      minLength: 8,
      maxLength: 72,
      error: 'A senha deve ter entre 8 e 72 caracteres.',
      examples: ['senha-forte'],
    }),
  },
  { additionalProperties: false },
);
