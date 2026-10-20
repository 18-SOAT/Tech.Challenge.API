import { t } from 'elysia';

// Cadastro no balcão. O nome é obrigatório aqui (regra da operação), não na entity:
// no auto-cadastro o cliente nasce sem nome. Ver docs/code/patterns/dto.md.
export const CreateCustomerRequestSchema = t.Object(
  {
    name: t.String({
      minLength: 1,
      maxLength: 120,
      error: 'Informe o nome do cliente (até 120 caracteres).',
      examples: ['João Silva'],
    }),
    document: t.String({
      format: 'cpf-cnpj',
      error: 'CPF/CNPJ inválido.',
      description: 'CPF (11 dígitos) ou CNPJ (14), com ou sem máscara',
      examples: ['529.982.247-25'],
    }),
    email: t.String({
      format: 'email',
      error: 'E-mail inválido.',
      description: 'Canal do primeiro acesso',
      examples: ['joao@oficina.com'],
    }),
    phone: t.Optional(
      t.String({
        format: 'phone',
        error: 'Telefone inválido. Informe DDD + número.',
        examples: ['(11) 98765-4321'],
      }),
    ),
  },
  { additionalProperties: false },
);
