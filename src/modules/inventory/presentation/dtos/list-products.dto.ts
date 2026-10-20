import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { ProductResponseSchema } from './product.response.dto.js';
import { ProductFields } from './product-fields.js';

// Body do QUERY /products. `belowMinimum: true` é a consulta "Produtos abaixo do
// mínimo" (stockQuantity < minimumStock), usada pelo atendente para repor.
export const ListProductsRequestSchema = t.Object(
  {
    ...PaginationFields,
    name: t.Optional(
      t.String({
        maxLength: 120,
        error: 'Filtro de nome inválido (até 120 caracteres).',
        description: 'Busca parcial, sem diferenciar maiúscula',
      }),
    ),
    sku: t.Optional(
      t.String({
        maxLength: 40,
        error: 'Filtro de SKU inválido (até 40 caracteres).',
        description: 'Busca parcial, sem diferenciar maiúscula',
      }),
    ),
    type: t.Optional(ProductFields.type),
    active: t.Optional(
      t.Boolean({ error: 'O filtro active deve ser true ou false.' }),
    ),
    belowMinimum: t.Optional(
      t.Boolean({
        error: 'O filtro belowMinimum deve ser true ou false.',
        description: 'true: só produtos com saldo abaixo do estoque mínimo',
      }),
    ),
  },
  { additionalProperties: false },
);

export const ProductPageSchema = PageSchema(
  ProductResponseSchema,
  'ProductPage',
);
