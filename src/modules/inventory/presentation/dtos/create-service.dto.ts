import { t } from 'elysia';
import { ServiceFields } from './service-fields.js';

// Todo serviço nasce ativo: o `active` só existe na alteração.
export const CreateServiceRequestSchema = t.Object(
  {
    name: ServiceFields.name,
    description: t.Optional(ServiceFields.description),
    price: ServiceFields.price,
    estimatedDurationMinutes: t.Optional(
      ServiceFields.estimatedDurationMinutes,
    ),
  },
  { additionalProperties: false },
);
