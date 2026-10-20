import { t } from 'elysia';

// Alteração parcial: só os campos enviados mudam. O documento não está aqui de
// propósito — é a identidade natural do cliente (imutável).
export const UpdateCustomerRequestSchema = t.Object(
  {
    name: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 120,
        error: 'Informe o nome do cliente (até 120 caracteres).',
        examples: ['João Silva'],
      }),
    ),
    email: t.Optional(
      t.String({
        format: 'email',
        error: 'E-mail inválido.',
        examples: ['joao@oficina.com'],
      }),
    ),
    phone: t.Optional(
      t.Union(
        [
          t.String({ format: 'phone', examples: ['(11) 98765-4321'] }),
          t.Null(),
        ],
        {
          error:
            'Telefone inválido. Informe DDD + número, ou null para remover.',
        },
      ),
    ),
  },
  {
    additionalProperties: false,
    minProperties: 1,
    error: 'Informe ao menos um campo para alterar.',
  },
);
