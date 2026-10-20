import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { CustomerResponseSchema } from './customer.response.dto.js';

// Body do QUERY /customers: filtros e paginação no corpo, não na URL — o CPF/CNPJ
// não fica registrado em log de acesso.
export const ListCustomersRequestSchema = t.Object(
  {
    ...PaginationFields,
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

export const CustomerPageSchema = PageSchema(
  CustomerResponseSchema,
  'CustomerPage',
);
