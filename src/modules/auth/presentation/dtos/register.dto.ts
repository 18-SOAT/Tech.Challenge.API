import { t } from 'elysia';

// Borda HTTP: formato e mensagens. Os VOs (Email, Password, Document, Phone)
// revalidam no domínio — defesa em profundidade. Ver docs/code/patterns/dto.md.
export const RegisterRequestSchema = t.Object(
  {
    email: t.String({
      format: 'email',
      error: 'E-mail inválido.',
      examples: ['joao@oficina.com'],
    }),
    password: t.String({
      minLength: 8,
      maxLength: 72,
      error: 'A senha deve ter entre 8 e 72 caracteres.',
      examples: ['senha-forte'],
    }),
    document: t.String({
      format: 'cpf-cnpj',
      error: 'CPF/CNPJ inválido.',
      description: 'CPF (11 dígitos) ou CNPJ (14), com ou sem máscara',
      examples: ['529.982.247-25'],
    }),
    phone: t.String({
      format: 'phone',
      error: 'Telefone inválido. Informe DDD + número.',
      examples: ['(11) 98765-4321'],
    }),
  },
  { additionalProperties: false },
);

export type RegisterRequest = typeof RegisterRequestSchema.static;
