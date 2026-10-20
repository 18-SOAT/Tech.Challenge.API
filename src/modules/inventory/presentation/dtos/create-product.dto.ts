import { t } from 'elysia';
import { ProductFields } from './product-fields.js';

// Sem saldo: o produto nasce com 0 e a entrada é uma movimentação
// (POST /products/:id/stock/entries). Todo produto nasce ativo.
export const CreateProductRequestSchema = t.Object(
  {
    sku: ProductFields.sku,
    name: ProductFields.name,
    description: t.Optional(ProductFields.description),
    type: ProductFields.type,
    price: ProductFields.price,
    minimumStock: t.Optional(ProductFields.minimumStock),
  },
  { additionalProperties: false },
);
