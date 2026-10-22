import { t } from 'elysia';
import { ServiceOrderFields } from './service-order-fields.js';

export const AddServiceItemRequestSchema = t.Object(
  {
    serviceId: t.String({ format: 'uuid', error: 'Id de serviço inválido.' }),
    quantity: ServiceOrderFields.quantity,
  },
  { additionalProperties: false },
);

export const AddProductItemRequestSchema = t.Object(
  {
    productId: t.String({ format: 'uuid', error: 'Id de produto inválido.' }),
    quantity: ServiceOrderFields.quantity,
  },
  { additionalProperties: false },
);

export const ChangeItemQuantityRequestSchema = t.Object(
  { quantity: ServiceOrderFields.quantity },
  { additionalProperties: false },
);
