import { t } from 'elysia';
import { CustomerResponseSchema } from './customer.response.dto.js';

// Body do QUERY /customers: filtros e paginação no corpo, não na URL — o CPF/CNPJ
// não fica registrado em log de acesso.
export const ListCustomersRequestSchema = t.Object(
  {
    page: t.Integer({
      minimum: 1,
      default: 1,
      error: 'A página deve ser um inteiro a partir de 1.',
    }),
    limit: t.Integer({
      minimum: 1,
      maximum: 100,
      default: 20,
      error: 'O limite deve ser um inteiro entre 1 e 100.',
    }),
    document: t.Optional(
      t.String({
        format: 'cpf-cnpj',
        error: 'CPF/CNPJ inválido.',
        description: 'Busca exata por CPF/CNPJ, com ou sem máscara',
        examples: ['529.982.247-25'],
      }),
    ),
    name: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 120,
        error: 'O filtro de nome deve ter entre 1 e 120 caracteres.',
        description: 'Parte do nome, sem diferenciar maiúsculas',
        examples: ['silva'],
      }),
    ),
  },
  { additionalProperties: false },
);

export const CustomerPageSchema = t.Object(
  {
    items: t.Array(CustomerResponseSchema),
    total: t.Integer({
      description: 'Total de clientes que atendem ao filtro',
    }),
    page: t.Integer(),
    limit: t.Integer(),
  },
  { title: 'CustomerPage' },
);
