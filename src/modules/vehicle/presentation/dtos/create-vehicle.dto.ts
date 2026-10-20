import { t } from 'elysia';
import { VehicleFields } from './vehicle-fields.js';

export const CreateVehicleRequestSchema = t.Object(
  {
    customerId: t.String({
      format: 'uuid',
      error: 'Id de cliente inválido.',
      description: 'Dono do veículo (fixo: não muda na alteração)',
    }),
    ...VehicleFields,
  },
  { additionalProperties: false },
);
