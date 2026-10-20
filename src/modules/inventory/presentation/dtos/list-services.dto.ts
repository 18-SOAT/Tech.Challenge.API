import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { ServiceResponseSchema } from './service.response.dto.js';

// Body do QUERY /services: busca no catálogo por nome e/ou status.
export const ListServicesRequestSchema = t.Object(
  {
    ...PaginationFields,
    name: t.Optional(
      t.String({
        maxLength: 120,
        error: 'Filtro de nome inválido (até 120 caracteres).',
        description: 'Busca parcial, sem diferenciar maiúscula',
      }),
    ),
    active: t.Optional(
      t.Boolean({ error: 'O filtro active deve ser true ou false.' }),
    ),
  },
  { additionalProperties: false },
);

export const ServicePageSchema = PageSchema(
  ServiceResponseSchema,
  'ServicePage',
);
