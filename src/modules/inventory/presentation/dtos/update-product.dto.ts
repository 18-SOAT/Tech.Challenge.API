import { t } from 'elysia';
import { ProductFields } from './product-fields.js';

// Alteração parcial dos dados de catálogo. `stockQuantity` não existe aqui de
// propósito: o Elysia descarta o campo extra, e saldo só muda por movimentação.
export const UpdateProductRequestSchema = t.Object(
  {
    sku: t.Optional(ProductFields.sku),
    name: t.Optional(ProductFields.name),
    description: t.Optional(ProductFields.description),
    type: t.Optional(ProductFields.type),
    price: t.Optional(ProductFields.price),
    minimumStock: t.Optional(ProductFields.minimumStock),
    active: t.Optional(
      t.Boolean({
        error: 'O campo active deve ser true ou false.',
        description: 'false desativa: não entra em orçamento novo',
      }),
    ),
  },
  {
    additionalProperties: false,
    minProperties: 1,
    error: 'Informe ao menos um campo para alterar.',
  },
);
